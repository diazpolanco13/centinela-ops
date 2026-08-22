import {
  CircleGeometry,
  Color,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** Fallback FBX→m si no hay nodo `Sketchfab_model`. */
export const ESCALA_SKETCHFAB = 0.0008886755094863474;

/** Multiplicador visual sobre el auto ~1:1 m. */
export const ESCALA_LECTURA = 1.4;

/**
 * Yaw extra en proto Z-up (eje Z = suelo). Nose del pack mira −Y;
 * GPS 0 = norte. Math.PI alinea frente con el rumbo.
 */
export const YAW_PROTOTIPO = Math.PI;

/** Elipse de sombra, metros sobre el suelo del modelo. */
export const ALTURA_SOMBRA_M = 0.02;

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

export function esMaterialCarroceria(mat: Material): boolean {
  return /^body/i.test(mat.name);
}

export function tipoDeUnidad(id: string): TipoAuto {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return TIPOS_AUTO[(h >>> 0) % TIPOS_AUTO.length] ?? "sedan";
}

function elipseSombra(): Mesh {
  const geo = new CircleGeometry(1.05, 32);
  geo.scale(1, 1.85, 1);
  const mat = new MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const mesh = new Mesh(geo, mat);
  mesh.name = "sombra";
  // Proto Z-up: CircleGeometry ya vive en XY (suelo). No rotar a XZ.
  mesh.position.z = ALTURA_SOMBRA_M;
  mesh.renderOrder = -1;
  return mesh;
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
 * Sombra se agrega después, ya en metros.
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
  proto.add(elipseSombra());
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

function aplicarColorCarroceria(mat: Material, hex: string): void {
  if (mat instanceof MeshStandardMaterial) {
    mat.color.set(hex);
    mat.map = null;
    mat.metalness = Math.min(mat.metalness, 0.2);
    mat.roughness = Math.max(mat.roughness, 0.45);
    mat.envMap = null;
    mat.needsUpdate = true;
    return;
  }
  if ("color" in mat && mat.color instanceof Color) {
    mat.color.set(hex);
  }
}

export function prototipoDeTipo(
  prototipos: Map<TipoAutoPack, Group>,
  tipo: TipoAutoPack,
): Group | undefined {
  return prototipos.get(tipo) ?? prototipos.get("sedan") ?? prototipos.values().next().value;
}

export function clonarUnidad(proto: Group, colorHex: string): Group {
  const inst = proto.clone(true);
  const paint: Material[] = [];
  inst.traverse((obj) => {
    if (!esMesh(obj) || obj.name === "sombra") return;
    const aplicar = (m: Material): Material => {
      if (!esMaterialCarroceria(m)) return m;
      const c = m.clone();
      aplicarColorCarroceria(c, colorHex);
      paint.push(c);
      return c;
    };
    obj.material = Array.isArray(obj.material) ? obj.material.map(aplicar) : aplicar(obj.material);
  });
  inst.userData.paint = paint;
  return inst;
}

export function pintarUnidad(inst: Object3D, colorHex: string): void {
  const paint = inst.userData.paint as Material[] | undefined;
  if (!paint) return;
  for (const m of paint) aplicarColorCarroceria(m, colorHex);
}

export function disposePaintUnidad(inst: Object3D): void {
  const paint = inst.userData.paint as Material[] | undefined;
  if (!paint) return;
  for (const m of paint) m.dispose();
  inst.userData.paint = [];
}
