import type { EstadoUnidad, UnidadEnMapa } from "@/data/unidadesMock";

export type DeviceStatus = "online" | "offline" | "unknown";

export type TraccarDevice = {
  id: number;
  name: string;
  uniqueId: string;
  status: DeviceStatus;
};

export type TraccarPosition = {
  id: number;
  deviceId: number;
  latitude: number;
  longitude: number;
  speed: number;
  course?: number;
  attributes?: {
    motion?: boolean;
    [clave: string]: unknown;
  };
};

const SPEED_DETENIDA_KN = 1;

export function coordsValidas(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function estadoUnidad(
  device: TraccarDevice | undefined,
  position: TraccarPosition | undefined,
): EstadoUnidad {
  if (!device || device.status === "offline" || device.status === "unknown") {
    return "sin_senal";
  }
  const motion = position?.attributes?.motion;
  if (motion === false) return "detenida";
  if (motion === true) return "en_ruta";
  if ((position?.speed ?? 0) < SPEED_DETENIDA_KN) return "detenida";
  return "en_ruta";
}

export function rumbo(course: number | undefined): number {
  if (!Number.isFinite(course)) return 0;
  const n = course as number;
  return ((n % 360) + 360) % 360;
}

function numeroAtributo(attrs: TraccarPosition["attributes"], clave: string): number | undefined {
  const v = attrs?.[clave];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Último rumbo real. GPS detenido suele mandar course=0 (norte falso). */
const ultimoRumbo = new Map<number, number>();

export function courseDePosicion(position: TraccarPosition): number {
  const raw =
    position.course ??
    numeroAtributo(position.attributes, "course") ??
    numeroAtributo(position.attributes, "heading");
  const speed = position.speed ?? 0;
  const enMovimiento = position.attributes?.motion === true || speed >= SPEED_DETENIDA_KN;

  if (Number.isFinite(raw)) {
    const n = rumbo(raw);
    if (n === 0 && !enMovimiento) {
      return ultimoRumbo.get(position.deviceId) ?? 0;
    }
    ultimoRumbo.set(position.deviceId, n);
    return n;
  }
  return ultimoRumbo.get(position.deviceId) ?? 0;
}

export function etiquetaCorta(nombre: string): string {
  const trimmed = nombre.trim();
  const digits = trimmed.match(/^(\d{2,4})\b/);
  if (digits) return digits[1];
  const word = trimmed.split(/[\s–—/_-]+/)[0] ?? trimmed;
  return word.length <= 12 ? word : `${word.slice(0, 11)}…`;
}

export function fusionarUnidades(
  devices: Map<number, TraccarDevice>,
  positions: Map<number, TraccarPosition>,
): UnidadEnMapa[] {
  const out: UnidadEnMapa[] = [];
  for (const device of devices.values()) {
    const position = positions.get(device.id);
    if (!position || !coordsValidas(position.latitude, position.longitude)) continue;
    out.push({
      id: String(device.id),
      nombre: device.name || device.uniqueId || `#${device.id}`,
      estado: estadoUnidad(device, position),
      lngLat: [position.longitude, position.latitude],
      course: courseDePosicion(position),
    });
  }
  return out;
}

export function aplicarDevices(
  store: Map<number, TraccarDevice>,
  incoming: TraccarDevice[],
): void {
  for (const device of incoming) store.set(device.id, device);
}

export function aplicarPositions(
  store: Map<number, TraccarPosition>,
  incoming: TraccarPosition[],
): void {
  for (const position of incoming) store.set(position.deviceId, position);
}
