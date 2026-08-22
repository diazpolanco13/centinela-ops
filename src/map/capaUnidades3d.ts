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
import { type UnidadEnMapa } from "@/data/unidadesMock";
import { leerPrefsUnidades } from "@/data/preferenciasUnidades";
import {
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

/** Escala extra del foco. No cambia color (alerta ops = rojo). */
export const ESCALA_SELECCION = 1.12;

/** Largo aprox. del mesh 1:1 (m). Base para px → escala. */
const LARGO_AUTO_M = 4.8;

/** Metros sobre el suelo: evita z-fight con el tile. */
const ALTITUD_M = 0.2;

/** Metros por pixel CSS (Web Mercator). */
function metrosPorPixel(lat: number, zoom: number): number {
  const cos = Math.cos((lat * Math.PI) / 180);
  return (cos * 2 * Math.PI * 6378137) / (256 * 2 ** zoom);
}

/**
 * Zoom lejos: tamaño fijo en pantalla (pxPantalla).
 * Zoom calle: no baja de escalaCalle (geo ~1:1×).
 */
export function escalaMeshUnidad(zoom: number, lat: number): number {
  const prefs = leerPrefsUnidades();
  const mpp = metrosPorPixel(lat, zoom);
  const escalaPantalla = (prefs.pxPantalla * mpp) / LARGO_AUTO_M;
  return Math.max(prefs.escalaCalle, escalaPantalla);
}

const _clip = new Matrix4();
const _origen = new Matrix4();
const _scale = new Vector3();
const _rotZ = new Matrix4();

/** IDs de labels en capaUnidades (evitar import circular). */
const ID_LABEL = "unidades-label";
const ID_LABEL_SEL = "unidades-label-sel";

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

  onAdd(map: MapLibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.soltarInstancias();
    this.map = map;
    this.camera = new Camera();
    this.scene = new Scene();
    this.scene.add(new AmbientLight(0xffffff, 1.35));
    const sol = new DirectionalLight(0xffffff, 1.25);
    sol.position.set(0.4, 1, 0.6).normalize();
    this.scene.add(sol);
    const fill = new DirectionalLight(0xffffff, 0.7);
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
    if (this.map) capas.delete(this.map);
    this.soltarInstancias();
    this.prototipos = undefined;
    this.pendientes = null;
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
    if (this.instancias.size === 0) return;

    const main = args.defaultProjectionData?.mainMatrix;
    if (!main) return;

    const canvas = map.getCanvas();
    renderer.setDrawingBufferSize(canvas.width, canvas.height, 1);

    const center = map.getCenter();
    const zoom = map.getZoom();
    const escalaZoom = escalaMeshUnidad(zoom, center.lat);
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
      // Bake deja proto Z-up (alto = Z). Yaw = eje Z (suelo).
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
      const color = leerPrefsUnidades().colores[u.estado];
      if (!inst) {
        const proto = prototipoDeTipo(prototipos, tipo);
        if (!proto) continue;
        inst = clonarUnidad(proto, color);
        inst.userData.tipo = tipo;
        inst.userData.estado = u.estado;
        inst.userData.color = color;
        inst.matrixAutoUpdate = false;
        inst.frustumCulled = false;
        inst.traverse((obj) => {
          obj.frustumCulled = false;
        });
        this.instancias.set(u.id, inst);
        scene.add(inst);
      } else if (inst.userData.tipo !== tipo) {
        scene.remove(inst);
        disposePaintUnidad(inst);
        const proto = prototipoDeTipo(prototipos, tipo);
        if (!proto) {
          this.instancias.delete(u.id);
          continue;
        }
        inst = clonarUnidad(proto, color);
        inst.userData.tipo = tipo;
        inst.userData.estado = u.estado;
        inst.userData.color = color;
        inst.matrixAutoUpdate = false;
        inst.frustumCulled = false;
        inst.traverse((obj) => {
          obj.frustumCulled = false;
        });
        this.instancias.set(u.id, inst);
        scene.add(inst);
      } else if (inst.userData.estado !== u.estado || inst.userData.color !== color) {
        pintarUnidad(inst, color);
        inst.userData.estado = u.estado;
        inst.userData.color = color;
      }

      inst.userData.lngLat = u.lngLat;
      inst.userData.course = u.course ?? 0;
      inst.userData.foco = u.id === selectedId;
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

/**
 * Tras `setStyle` (MAP↔SAT) MapLibre llama onRemove: la instancia queda muerta.
 * Siempre new CapaUnidades3d al re-añadir.
 */
export function montarCapaUnidades3d(
  map: MapLibreMap,
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): void {
  if (!map.getStyle()) return;

  let capa = capas.get(map);
  if (!map.getLayer(ID_CAPA_UNIDADES_3D)) {
    capa = new CapaUnidades3d();
    capas.set(map, capa);
    // Encima de rasters; debajo de labels si ya existen.
    const under = map.getLayer(ID_LABEL)
      ? ID_LABEL
      : map.getLayer(ID_LABEL_SEL)
        ? ID_LABEL_SEL
        : undefined;
    map.addLayer(capa, under);
  } else if (capa) {
    const under = map.getLayer(ID_LABEL)
      ? ID_LABEL
      : map.getLayer(ID_LABEL_SEL)
        ? ID_LABEL_SEL
        : undefined;
    if (under) map.moveLayer(ID_CAPA_UNIDADES_3D, under);
  }

  capa?.setUnidades(unidades, selectedId);
  map.triggerRepaint();
}
