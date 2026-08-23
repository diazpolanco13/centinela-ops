import type { EstadoUnidad, TelemetriaUnidad, UnidadEnMapa } from "@/data/unidadesMock";

export type DeviceStatus = "online" | "offline" | "unknown";

export type TraccarDevice = {
  id: number;
  name: string;
  uniqueId: string;
  status: DeviceStatus;
  lastUpdate?: string;
  category?: string;
  attributes?: {
    deviceImage?: string;
    [clave: string]: unknown;
  };
};

export type TraccarPosition = {
  id: number;
  deviceId: number;
  latitude: number;
  longitude: number;
  speed: number;
  course?: number;
  fixTime?: string;
  deviceTime?: string;
  serverTime?: string;
  attributes?: {
    motion?: boolean;
    ignition?: boolean;
    battery?: number;
    alarm?: string;
    [clave: string]: unknown;
  };
  geofenceIds?: number[];
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
  const speed = position?.speed ?? 0;
  const moviendo = motion === true || (motion !== false && speed >= SPEED_DETENIDA_KN);
  const enZona = Array.isArray(position?.geofenceIds) && position.geofenceIds.length > 0;
  if (!moviendo && enZona) return "en_zona";
  if (motion === false) return "detenida";
  if (motion === true) return "en_ruta";
  if (speed < SPEED_DETENIDA_KN) return "detenida";
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

/** Último instante en movimiento (sesión). No es lastUpdate. */
const ultimoMovimiento = new Map<number, number>();

function msIso(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : undefined;
}

function boolAttr(attrs: TraccarPosition["attributes"], clave: string): boolean | null {
  const v = attrs?.[clave];
  return typeof v === "boolean" ? v : null;
}

function textoAttr(attrs: TraccarPosition["attributes"], clave: string): string | undefined {
  const v = attrs?.[clave];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export function urlFotoDispositivo(uniqueId: string | undefined, deviceImage: unknown): string | undefined {
  if (!uniqueId || typeof deviceImage !== "string") return undefined;
  const file = deviceImage.trim();
  if (!file) return undefined;
  return `/api/media/${encodeURIComponent(uniqueId)}/${encodeURIComponent(file)}`;
}

function registrarMovimiento(deviceId: number, position: TraccarPosition): number | undefined {
  const motion = position.attributes?.motion;
  const speed = position.speed ?? 0;
  const moviendo = motion === true || (motion !== false && speed >= SPEED_DETENIDA_KN);
  const when = msIso(position.fixTime) ?? msIso(position.deviceTime) ?? Date.now();
  if (moviendo) {
    ultimoMovimiento.set(deviceId, when);
    return when;
  }
  return ultimoMovimiento.get(deviceId);
}

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
    const lastMotionMs = registrarMovimiento(device.id, position);
    const attrs = position.attributes;
    const telemetria: TelemetriaUnidad = {
      speedKn: position.speed ?? 0,
      motion: boolAttr(attrs, "motion"),
      ignition: boolAttr(attrs, "ignition"),
      batteryV: numeroAtributo(attrs, "battery"),
      lastFixMs: msIso(position.fixTime) ?? msIso(position.deviceTime),
      lastUpdateMs: msIso(device.lastUpdate),
      lastMotionMs,
      category: device.category,
      alarm: textoAttr(attrs, "alarm"),
      fotoUrl: urlFotoDispositivo(device.uniqueId, device.attributes?.deviceImage),
    };
    out.push({
      id: String(device.id),
      nombre: device.name || device.uniqueId || `#${device.id}`,
      estado: estadoUnidad(device, position),
      lngLat: [position.longitude, position.latitude],
      course: courseDePosicion(position),
      telemetria,
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
