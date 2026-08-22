import {
  CanvasTexture,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { leerPrefsUnidades, type EstiloMarcaEstado } from "@/data/preferenciasUnidades";

/** Fallback FBX→m si no hay nodo `Sketchfab_model`. */
export const ESCALA_SKETCHFAB = 0.0008886755094863474;

/** Multiplicador visual sobre el auto ~1:1 m. */
export const ESCALA_LECTURA = 1.4;

/**
 * Yaw extra en proto Z-up (eje Z = suelo). Nose del pack mira −Y;
 * GPS 0 = norte. Math.PI alinea frente con el rumbo.
 */
export const YAW_PROTOTIPO = Math.PI;

/** Marca de estado, metros sobre el suelo del modelo. */
export const ALTURA_MARCA_M = 0.02;

export const URL_MODELO_AUTOS = "/models/autos.glb";

export const TIPOS_AUTO = ["sedan", "suv", "pickup", "minivan", "hatchback"] as const;
export type TipoAuto = (typeof TIPOS_AUTO)[number];

/** Tipos extra del pack; se arman por si el hash los usa. */
export type TipoAutoPack =
  | TipoAuto
  | "compact"
  | "coupe"
  | "sport"
  | "offroad"
  | "wagon";

const NOMBRE_BODY_A_TIPO: Record<string, TipoAutoPack> = {
  "Sedan Body": "sedan",
  "SUV Body": "suv",
  "Pickup Body": "pickup",
  "minivan body": "minivan",
  "Hatchback Body": "hatchback",
  "Compact Body": "compact",
  "Coupe Body": "coupe",
  "Sport body": "sport",
  "Offroad Body": "offroad",
  "Wagon Body": "wagon",
};

/**
 * Ruedas no parentadas (hermanos bajo RootNode). Letras duplicadas:
 * Wheel_C Compact, Wheel_F Coupe, Wheel_B Hatchback, Wheel_D minivan,
 * Wheel_G Offroad, Wheel_H Sport; Wheel_E Pickup vs SUV y Wheel_A Sedan vs Wagon
 * se resuelven por distancia 3D al body.
 */
const EXCLUIR = new Set(["Cylinder001"]);

const _posA = new Vector3();
const _posB = new Vector3();
const _invBody = new Matrix4();
const _escalaNodo = new Vector3();

function esMesh(obj: Object3D): obj is Mesh {
  return (obj as Mesh).isMesh === true;
}

const BODY_NORM = new Map(
  Object.entries(NOMBRE_BODY_A_TIPO).map(([k, v]) => [k.replace(/_/g, " ").trim().toLowerCase(), v]),
);

function tipoBodyExacto(nombre: string): TipoAutoPack | undefined {
  const clave = (s: string) =>
    NOMBRE_BODY_A_TIPO[s] ?? BODY_NORM.get(s.replace(/_/g, " ").trim().toLowerCase());
  const directo = clave(nombre);
  if (directo) return directo;
  const sinMesh = nombre.replace(/_(Body|Glass|Optics)_\d+$/i, "");
  if (sinMesh !== nombre) return clave(sinMesh);
  return undefined;
}

/** Grupos RootNode: Wheel_C, Wheel_C001. No meshes Wheel_C_Wheel_0. */
function esGrupoRueda(nombre: string): boolean {
  return /^Wheel_[A-H](?:\d{3})?$/i.test(nombre);
}

export function tipoDeUnidad(id: string): TipoAuto {
  const prefs = leerPrefsUnidades();
  if (prefs.silueta !== "auto") return prefs.silueta;
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return TIPOS_AUTO[(h >>> 0) % TIPOS_AUTO.length] ?? "sedan";
}

let texAura: CanvasTexture | null = null;

function texturaAura(): CanvasTexture {
  if (texAura) return texAura;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas 2d aura");
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, "rgba(255,255,255,0.92)");
  g.addColorStop(0.42, "rgba(255,255,255,0.38)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  texAura = new CanvasTexture(c);
  texAura.needsUpdate = true;
  return texAura;
}

function matMarca(opts: { map?: CanvasTexture; opacity: number }): MeshBasicMaterial {
  const mat = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: opts.opacity,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
  if (opts.map) mat.map = opts.map;
  mat.userData.opacidadBase = opts.opacity;
  return mat;
}

function meshMarca(nombre: string, geo: CircleGeometry | RingGeometry, mat: MeshBasicMaterial, z: number): Mesh {
  const mesh = new Mesh(geo, mat);
  mesh.name = nombre;
  mesh.visible = false;
  mesh.position.z = z;
  mesh.renderOrder = -1;
  return mesh;
}

/**
 * Tres marcas en XY (suelo proto Z-up). Visible = estilo activo.
 * Aura = blob suave; disco = puck; anillo = aro.
 */
function grupoMarcaEstado(): Group {
  const g = new Group();
  g.name = "marcaEstado";

  const geoAura = new CircleGeometry(1.85, 48);
  geoAura.scale(1, 1.7, 1);
  const geoDisco = new CircleGeometry(1.55, 48);
  const geoAnillo = new RingGeometry(1.25, 1.7, 48);
  geoAnillo.scale(1, 1.25, 1);

  g.add(meshMarca("marca-aura", geoAura, matMarca({ map: texturaAura(), opacity: 1 }), ALTURA_MARCA_M));
  g.add(meshMarca("marca-disco", geoDisco, matMarca({ opacity: 0.62 }), ALTURA_MARCA_M + 0.005));
  g.add(meshMarca("marca-anillo", geoAnillo, matMarca({ opacity: 0.9 }), ALTURA_MARCA_M + 0.01));
  return g;
}

export function esMeshMarca(obj: Object3D): obj is Mesh {
  return esMesh(obj) && obj.name.startsWith("marca-");
}

function leerEscalaSketchfab(raiz: Object3D): number {
  const n = raiz.name === "Sketchfab_model" ? raiz : raiz.getObjectByName("Sketchfab_model");
  if (!n) return ESCALA_SKETCHFAB;
  // Nodo GLB trae `matrix`; .scale puede quedar 1 si no se descompuso.
  _escalaNodo.setFromMatrixScale(n.matrix);
  const sx = _escalaNodo.x;
  return Number.isFinite(sx) && sx > 0 ? sx : ESCALA_SKETCHFAB;
}

/**
 * `_invBody * world` deja geometría en unidades FBX (sedán ~4900 u ≈ 4.4 km).
 * `inst.matrix` se reconstruye cada frame y pisa `proto.scale` — bake en hijos.
 * Marca de estado se agrega después, ya en metros.
 */
function bakeEscalaFbxAMetros(proto: Group, escalaFbx: number): void {
  for (const child of proto.children) {
    child.position.multiplyScalar(escalaFbx);
    child.scale.multiplyScalar(escalaFbx);
  }
}

function prototipoDesde(body: Object3D, ruedas: Object3D[], escalaFbx: number): Group {
  body.updateWorldMatrix(true, false);
  _invBody.copy(body.matrixWorld).invert();

  const proto = new Group();
  proto.name = body.name;

  for (const src of [body, ...ruedas]) {
    src.updateWorldMatrix(true, false);
    const clone = src.clone(true);
    clone.matrix.copy(_invBody).multiply(src.matrixWorld);
    clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);
    clone.matrixAutoUpdate = true;
    proto.add(clone);
  }

  bakeEscalaFbxAMetros(proto, escalaFbx);
  proto.add(grupoMarcaEstado());
  proto.frustumCulled = false;
  proto.traverse((obj) => {
    obj.frustumCulled = false;
  });
  return proto;
}

function armarPrototipos(raiz: Object3D): Map<TipoAutoPack, Group> {
  raiz.updateWorldMatrix(true, true);
  const escalaFbx = leerEscalaSketchfab(raiz);

  const bodies: Object3D[] = [];
  const vistos = new Set<TipoAutoPack>();
  const ruedas: Object3D[] = [];

  raiz.traverse((obj) => {
    if (obj === raiz) return;
    if (EXCLUIR.has(obj.name) || /^Cylinder/i.test(obj.name)) return;
    const tipo = tipoBodyExacto(obj.name);
    if (tipo && !vistos.has(tipo)) {
      vistos.add(tipo);
      bodies.push(obj);
      return;
    }
    if (esGrupoRueda(obj.name)) ruedas.push(obj);
  });

  const asignadas = new Map<Object3D, Object3D[]>();
  for (const body of bodies) asignadas.set(body, []);

  for (const rueda of ruedas) {
    rueda.updateWorldMatrix(true, false);
    _posA.setFromMatrixPosition(rueda.matrixWorld);
    let mejor: Object3D | null = null;
    let mejorDist = Infinity;
    for (const body of bodies) {
      body.updateWorldMatrix(true, false);
      _posB.setFromMatrixPosition(body.matrixWorld);
      const d = _posA.distanceTo(_posB);
      if (d < mejorDist) {
        mejorDist = d;
        mejor = body;
      }
    }
    if (mejor) asignadas.get(mejor)?.push(rueda);
  }

  const out = new Map<TipoAutoPack, Group>();
  for (const body of bodies) {
    const tipo = tipoBodyExacto(body.name);
    if (!tipo) continue;
    out.set(tipo, prototipoDesde(body, asignadas.get(body) ?? [], escalaFbx));
  }
  return out;
}

let cache: Map<TipoAutoPack, Group> | null = null;
let carga: Promise<Map<TipoAutoPack, Group>> | null = null;

export function cargarPrototiposAutos(): Promise<Map<TipoAutoPack, Group>> {
  if (cache && cache.size > 0) return Promise.resolve(cache);
  cache = null;
  carga ??= (async () => {
    try {
      const gltf = await new GLTFLoader().loadAsync(URL_MODELO_AUTOS);
      const armados = armarPrototipos(gltf.scene);
      if (armados.size === 0) {
        const nombres: string[] = [];
        gltf.scene.traverse((o) => {
          if (o.name) nombres.push(o.name);
        });
        console.error("autos.glb: 0 prototipos. nodos:", nombres.slice(0, 80).join(" | "));
        carga = null;
        return armados;
      }
      cache = armados;
      return armados;
    } catch (err) {
      console.error("autos.glb no cargó", err);
      carga = null;
      return new Map();
    }
  })();
  return carga;
}

function asegurarMarcaEnProto(proto: Group): void {
  if (proto.getObjectByName("marca-aura")) return;
  const vieja = proto.getObjectByName("sombra");
  if (vieja) proto.remove(vieja);
  proto.add(grupoMarcaEstado());
}

export function prototipoDeTipo(
  prototipos: Map<TipoAutoPack, Group>,
  tipo: TipoAutoPack,
): Group | undefined {
  const proto = prototipos.get(tipo) ?? prototipos.get("sedan") ?? prototipos.values().next().value;
  if (proto) asegurarMarcaEnProto(proto);
  return proto;
}

export function esMaterialCarroceria(mat: Material): boolean {
  return /^body/i.test(mat.name);
}

function aplicarColorCarroceria(mat: Material, hex: string): void {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  if (mat instanceof MeshStandardMaterial) {
    mat.color.set(hex);
    if (mat.map) mat.map = null;
    mat.metalness = Math.min(mat.metalness, 0.18);
    mat.roughness = Math.max(mat.roughness, 0.5);
    mat.emissive.set(hex);
    mat.emissiveIntensity = 0.22;
    mat.envMap = null;
    mat.needsUpdate = true;
    return;
  }
  if ("color" in mat && mat.color instanceof Color) {
    mat.color.set(hex);
  }
}

function clonarMat(m: Material): Material {
  const c = m.clone();
  if (c.userData.opacidadBase == null && typeof m.userData.opacidadBase === "number") {
    c.userData.opacidadBase = m.userData.opacidadBase;
  }
  return c;
}

export function clonarUnidad(proto: Group, colorVehiculo: string): Group {
  const inst = proto.clone(true);
  const marca: Material[] = [];
  const paint: Material[] = [];
  inst.traverse((obj) => {
    if (!esMesh(obj)) return;
    if (esMeshMarca(obj)) {
      const src = obj.material;
      if (Array.isArray(src)) {
        obj.material = src.map((m) => {
          const c = clonarMat(m);
          marca.push(c);
          return c;
        });
      } else {
        const c = clonarMat(src);
        obj.material = c;
        marca.push(c);
      }
      return;
    }
    const aplicar = (m: Material): Material => {
      if (!esMaterialCarroceria(m)) return m;
      const c = m.clone();
      aplicarColorCarroceria(c, colorVehiculo);
      paint.push(c);
      return c;
    };
    obj.material = Array.isArray(obj.material) ? obj.material.map(aplicar) : aplicar(obj.material);
  });
  inst.userData.marca = marca;
  inst.userData.paint = paint;
  return inst;
}

export function pintarCarroceria(inst: Object3D, colorHex: string): void {
  const paint = inst.userData.paint as Material[] | undefined;
  if (!paint) return;
  for (const m of paint) aplicarColorCarroceria(m, colorHex);
}

export function pintarMarcaEstado(inst: Object3D, colorHex: string, estilo: EstiloMarcaEstado): void {
  inst.traverse((obj) => {
    if (!esMeshMarca(obj)) return;
    obj.visible = obj.name === `marca-${estilo}`;
  });
  const mats = inst.userData.marca as Material[] | undefined;
  if (!mats) return;
  for (const m of mats) {
    if ("color" in m && m.color instanceof Color) m.color.set(colorHex);
  }
}

/** Alias HMR: callers viejos (`pintarUnidad`). */
export function pintarUnidad(inst: Object3D, colorHex: string): void {
  pintarMarcaEstado(inst, colorHex, leerPrefsUnidades().estiloMarca);
}

/** Pulso senoidal ~1.8s. `activo=false` restaura opacidad base. */
export function pulsarMarcas(inst: Object3D, tMs: number, activo: boolean): void {
  const mats = inst.userData.marca as Material[] | undefined;
  if (!mats) return;
  const k = activo ? 0.56 + 0.44 * (0.5 + 0.5 * Math.sin((tMs / 1800) * Math.PI * 2)) : 1;
  for (const m of mats) {
    if (!("opacity" in m)) continue;
    const base = typeof m.userData.opacidadBase === "number" ? m.userData.opacidadBase : 0.7;
    m.opacity = base * k;
  }
}

export function tieneMarcaEstado(inst: Object3D): boolean {
  return inst.getObjectByName("marca-aura") != null;
}

export function disposePaintUnidad(inst: Object3D): void {
  const marca = inst.userData.marca as Material[] | undefined;
  const paint = inst.userData.paint as Material[] | undefined;
  if (marca) {
    for (const m of marca) m.dispose();
    inst.userData.marca = [];
  }
  if (paint) {
    for (const m of paint) m.dispose();
    inst.userData.paint = [];
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cache = null;
    carga = null;
    texAura = null;
  });
}
