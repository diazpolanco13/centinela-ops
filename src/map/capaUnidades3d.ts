import {
  AmbientLight,
  Camera,
  DirectionalLight,
  Matrix4,
  Scene,
  Vector3,
  WebGLRenderer,
  type Group,
} from "three";
import { MercatorCoordinate, type CustomLayerInterface, type CustomRenderMethodInput, type Map as MapLibreMap } from "maplibre-gl";
import { COLOR_ESTADO, type UnidadEnMapa } from "@/data/unidadesMock";
import {
  ESCALA_LECTURA,
  YAW_PROTOTIPO,
  cargarPrototiposAutos,
  clonarUnidad,
  disposePaintUnidad,
  pintarUnidad,
  prototipoDeTipo,
  tipoDeUnidad,
  type TipoAutoPack,
} from "@/map/prototiposAutos";

export const ID_CAPA_UNIDADES_3D = "unidades-3d";

/** LOD: mesh three a este zoom; sprites 2D debajo. */
export const ZOOM_UNIDADES_3D = 16;

/** Escala extra del foco. No cambia color (alerta ops = rojo). */
export const ESCALA_SELECCION = 1.12;

/**
 * Escala al cruzar LOD (barra ~200 m). 7.5× ≈ 33 m = punto; 15× ≈ 65 m
 * se lee forma y rumbo. Baja a ESCALA_LECTURA en zoom calle.
 */
export const ESCALA_APARICION = 15;

/** A este zoom (y más) el auto ya es tamaño calle. */
const ZOOM_ESCALA_CALLE = 19.5;

/** Metros sobre el suelo: evita z-fight con el tile. */
const ALTITUD_M = 0.2;

export function escalaMeshUnidad(zoom: number): number {
  const span = ZOOM_ESCALA_CALLE - ZOOM_UNIDADES_3D;
  const t = Math.min(1, Math.max(0, (zoom - ZOOM_UNIDADES_3D) / span));
  const ease = 1 - (1 - t) ** 2;
  return ESCALA_APARICION + ease * (ESCALA_LECTURA - ESCALA_APARICION);
}

function proyeccionEsGlobo(map: MapLibreMap): boolean {
  return map.getProjection()?.type === "globe";
}

const _clip = new Matrix4();
const _origen = new Matrix4();
const _scale = new Vector3();
const _rotZ = new Matrix4();

function idPrimerSymbolConTexto(map: MapLibreMap): string | undefined {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    const layout = layer.layout as Record<string, unknown> | undefined;
    if (layer.type === "symbol" && layout && "text-field" in layout) {
      return layer.id;
    }
  }
  return undefined;
}

/** Sprites se ocultan solo cuando el mesh se pinta de verdad (mercator + zoom). */
const OPACIDAD_CON_MESH = ["step", ["zoom"], 1, ZOOM_UNIDADES_3D, 0] as const;

function syncOpacidadSprites(map: MapLibreMap, pintarMesh: boolean): void {
  const op = pintarMesh ? OPACIDAD_CON_MESH : 1;
  if (map.getLayer("unidades-puck")) {
    map.setPaintProperty("unidades-puck", "icon-opacity", op);
  }
  if (map.getLayer("unidades-apple")) {
    map.setPaintProperty("unidades-apple", "icon-opacity", op);
  }
}

function debePintarMesh(map: MapLibreMap, hayInstancias: boolean): boolean {
  return hayInstancias && !proyeccionEsGlobo(map);
}

class CapaUnidades3d implements CustomLayerInterface {
  id = ID_CAPA_UNIDADES_3D;
  type = "custom" as const;
  renderingMode = "3d" as const;

  private map: MapLibreMap | undefined;
  private renderer: WebGLRenderer | undefined;
  private scene: Scene | undefined;
  private camera: Camera | undefined;
  private prototipos: Map<TipoAutoPack, Group> | undefined;
  private instancias = new Map<string, Group>();
  private pendientes: { unidades: UnidadEnMapa[]; selectedId: string | null } | null = null;
  /** Último `pintarMesh` enviado a icon-opacity (no setPaint cada frame). */
  private opacityMeshActivo = false;

  onAdd(map: MapLibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.soltarInstancias();
    this.map = map;
    this.camera = new Camera();
    this.scene = new Scene();
    this.scene.add(new AmbientLight(0xffffff, 1.1));
    const sol = new DirectionalLight(0xffffff, 1.15);
    sol.position.set(0.4, 1, 0.6).normalize();
    this.scene.add(sol);
    const fill = new DirectionalLight(0xffffff, 0.55);
    fill.position.set(-0.5, 0.2, -0.4).normalize();
    this.scene.add(fill);

    this.renderer = new WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false;

    void cargarPrototiposAutos().then((protos) => {
      if (!this.map) return;
      this.prototipos = protos;
      if (this.pendientes) {
        this.aplicarUnidades(this.pendientes.unidades, this.pendientes.selectedId);
        this.pendientes = null;
      }
      this.map.triggerRepaint();
    });
  }

  onRemove(): void {
    if (this.map) {
      this.opacityMeshActivo = false;
      syncOpacidadSprites(this.map, false);
    }
    this.soltarInstancias();
    this.scene = undefined;
    this.camera = undefined;
    this.map = undefined;
    // Contexto WebGL compartido con MapLibre: no renderer.dispose().
    this.renderer = undefined;
  }

  setUnidades(unidades: UnidadEnMapa[], selectedId: string | null): void {
    if (!this.prototipos || !this.scene) {
      this.pendientes = { unidades, selectedId };
      return;
    }
    this.aplicarUnidades(unidades, selectedId);
  }

  render(_gl: WebGLRenderingContext | WebGL2RenderingContext, args: CustomRenderMethodInput): void {
    const map = this.map;
    const renderer = this.renderer;
    const scene = this.scene;
    const camera = this.camera;
    if (!map || !renderer || !scene || !camera) return;

    const pintarMesh = debePintarMesh(map, this.instancias.size > 0);
    if (pintarMesh !== this.opacityMeshActivo) {
      this.opacityMeshActivo = pintarMesh;
      syncOpacidadSprites(map, pintarMesh);
    }

    if (!pintarMesh) return;
    if (map.getZoom() < ZOOM_UNIDADES_3D) return;

    const main = args.defaultProjectionData?.mainMatrix;
    if (!main) return;

    const canvas = map.getCanvas();
    renderer.setDrawingBufferSize(canvas.width, canvas.height, 1);

    const center = map.getCenter();
    const zoom = map.getZoom();
    const escalaZoom = escalaMeshUnidad(zoom);
    const origin = MercatorCoordinate.fromLngLat([center.lng, center.lat], 0);
    const s = origin.meterInMercatorCoordinateUnits();
    _origen.makeTranslation(origin.x, origin.y, origin.z).scale(_scale.set(s, -s, s));
    camera.projectionMatrix.copy(_clip.fromArray(main)).multiply(_origen);

    for (const inst of this.instancias.values()) {
      const lngLat = inst.userData.lngLat as [number, number];
      const course = (inst.userData.course as number) ?? 0;
      const foco = inst.userData.foco === true ? ESCALA_SELECCION : 1;
      const escala = escalaZoom * foco;
      const mc = MercatorCoordinate.fromLngLat(lngLat, ALTITUD_M);
      const dx = (mc.x - origin.x) / s;
      const dy = (mc.y - origin.y) / -s;
      const dz = (mc.z - origin.z) / s;
      // Bake deja proto Z-up (alto = Z). RotX +90° del ejemplo glTF Y-up
      // los para de pie. Yaw = eje Z (suelo).
      const yaw = YAW_PROTOTIPO - (course * Math.PI) / 180;
      inst.matrix
        .makeTranslation(dx, dy, dz)
        .multiply(_rotZ.makeRotationZ(yaw))
        .scale(_scale.set(escala, escala, escala));
      inst.matrixWorldNeedsUpdate = true;
    }

    renderer.resetState();
    renderer.render(scene, camera);
  }

  private aplicarUnidades(unidades: UnidadEnMapa[], selectedId: string | null): void {
    const scene = this.scene;
    const prototipos = this.prototipos;
    const map = this.map;
    if (!scene || !prototipos) return;

    const vivas = new Set(unidades.map((u) => u.id));
    for (const [id, inst] of this.instancias) {
      if (vivas.has(id)) continue;
      scene.remove(inst);
      disposePaintUnidad(inst);
      this.instancias.delete(id);
    }

    for (const u of unidades) {
      let inst = this.instancias.get(u.id);
      const tipo = tipoDeUnidad(u.id);
      if (!inst) {
        const proto = prototipoDeTipo(prototipos, tipo);
        if (!proto) continue;
        inst = clonarUnidad(proto, COLOR_ESTADO[u.estado]);
        inst.userData.tipo = tipo;
        inst.userData.estado = u.estado;
        inst.matrixAutoUpdate = false;
        inst.frustumCulled = false;
        inst.traverse((obj) => {
          obj.frustumCulled = false;
        });
        this.instancias.set(u.id, inst);
        scene.add(inst);
      } else if (inst.userData.estado !== u.estado) {
        pintarUnidad(inst, COLOR_ESTADO[u.estado]);
        inst.userData.estado = u.estado;
      }

      inst.userData.lngLat = u.lngLat;
      inst.userData.course = u.course ?? 0;
      inst.userData.foco = u.id === selectedId;
    }

    if (map) {
      const pintarMesh = debePintarMesh(map, this.instancias.size > 0);
      this.opacityMeshActivo = pintarMesh;
      syncOpacidadSprites(map, pintarMesh);
    }
  }

  private soltarInstancias(): void {
    for (const inst of this.instancias.values()) {
      this.scene?.remove(inst);
      disposePaintUnidad(inst);
    }
    this.instancias.clear();
  }
}

const capas = new WeakMap<MapLibreMap, CapaUnidades3d>();

export function setDataUnidades3d(
  map: MapLibreMap,
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): void {
  if (!map.getLayer(ID_CAPA_UNIDADES_3D)) {
    montarCapaUnidades3d(map, unidades, selectedId);
    return;
  }
  capas.get(map)?.setUnidades(unidades, selectedId);
}

export function montarCapaUnidades3d(
  map: MapLibreMap,
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): void {
  if (!map.getStyle()) return;
  const beforeId = idPrimerSymbolConTexto(map);
  let capa = capas.get(map);
  if (!capa || !map.getLayer(ID_CAPA_UNIDADES_3D)) {
    capa ??= new CapaUnidades3d();
    capas.set(map, capa);
    if (!map.getLayer(ID_CAPA_UNIDADES_3D)) {
      map.addLayer(capa, beforeId);
    }
  } else if (beforeId) {
    map.moveLayer(ID_CAPA_UNIDADES_3D, beforeId);
  }
  capa.setUnidades(unidades, selectedId);
}
