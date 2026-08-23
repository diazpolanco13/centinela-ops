import simplify from "@turf/simplify";
import { coordsValidas, type TraccarPosition } from "@/data/traccar";

export const VENTANA_ESTELA_DEFECTO_MIN = 60;
export const VENTANAS_ESTELA_MIN = [15, 60, 360] as const;
export type VentanaEstelaMin = (typeof VENTANAS_ESTELA_MIN)[number];

export const ETIQUETA_VENTANA: Record<VentanaEstelaMin, string> = {
  15: "15m",
  60: "1h",
  360: "6h",
};

const LIMITE_SIMPLIFICAR = 800;
const TOLERANCIA_SIMPLIFY = 0.00004;
const SPEED_PARADA_KN = 1;
const PARADA_MIN_MS = 2 * 60_000;

export type PingRecorrido = {
  lngLat: [number, number];
  t: number;
  speed: number;
};

export type ParadaEstela = {
  lngLat: [number, number];
  t: number;
};

export type RecorridoUnidad = {
  coords: [number, number][];
  paradas: ParadaEstela[];
};

function tiempoMs(p: TraccarPosition): number {
  const raw = p.fixTime ?? p.deviceTime ?? p.serverTime;
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function pingsDesdeApi(raw: TraccarPosition[]): PingRecorrido[] {
  const out: PingRecorrido[] = [];
  for (const p of raw) {
    if (!coordsValidas(p.latitude, p.longitude)) continue;
    out.push({
      lngLat: [p.longitude, p.latitude],
      t: tiempoMs(p),
      speed: p.speed ?? 0,
    });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

/** Paradas: speed ~0 durante ≥ 2 min. Centroide del tramo. */
export function detectarParadas(pings: PingRecorrido[]): ParadaEstela[] {
  const paradas: ParadaEstela[] = [];
  let i = 0;
  while (i < pings.length) {
    if (pings[i].speed >= SPEED_PARADA_KN) {
      i += 1;
      continue;
    }
    const inicio = i;
    while (i < pings.length && pings[i].speed < SPEED_PARADA_KN) i += 1;
    const tramo = pings.slice(inicio, i);
    const dt = (tramo[tramo.length - 1]?.t ?? 0) - (tramo[0]?.t ?? 0);
    if (dt < PARADA_MIN_MS || tramo.length === 0) continue;
    let lng = 0;
    let lat = 0;
    for (const p of tramo) {
      lng += p.lngLat[0];
      lat += p.lngLat[1];
    }
    paradas.push({
      lngLat: [lng / tramo.length, lat / tramo.length],
      t: tramo[0].t,
    });
  }
  return paradas;
}

function coordsUnicas(pings: PingRecorrido[]): [number, number][] {
  const coords: [number, number][] = [];
  for (const p of pings) {
    const prev = coords[coords.length - 1];
    if (prev && prev[0] === p.lngLat[0] && prev[1] === p.lngLat[1]) continue;
    coords.push(p.lngLat);
  }
  return coords;
}

function simplificarSiHaceFalta(coords: [number, number][]): [number, number][] {
  if (coords.length <= LIMITE_SIMPLIFICAR) return coords;
  const feat = simplify(
    {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: coords },
    },
    { tolerance: TOLERANCIA_SIMPLIFY, highQuality: false },
  );
  const next = feat.geometry.coordinates as [number, number][];
  return next.length >= 2 ? next : coords;
}

export function armarRecorrido(pings: PingRecorrido[]): RecorridoUnidad {
  const paradas = detectarParadas(pings);
  const coords = simplificarSiHaceFalta(coordsUnicas(pings));
  if (coords.length < 2) return { coords: [], paradas };
  return { coords, paradas };
}

function pingsMock(destino: [number, number], minutos: number): PingRecorrido[] {
  const n = Math.min(240, Math.max(24, Math.round(minutos * 1.2)));
  const t0 = Date.now() - minutos * 60_000;
  const dt = (minutos * 60_000) / Math.max(1, n - 1);
  const stopStart = Math.floor(n * 0.38);
  const stopLen = Math.max(3, Math.ceil(n * (150_000 / (minutos * 60_000))));
  const out: PingRecorrido[] = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 1 : i / (n - 1);
    const wobble = Math.sin(u * Math.PI * 3) * 0.0022;
    const lng = destino[0] - 0.016 * (1 - u) + wobble;
    const lat = destino[1] - 0.011 * (1 - u) + Math.cos(u * Math.PI * 2.2) * 0.0014;
    const parked = i >= stopStart && i < stopStart + stopLen;
    out.push({
      lngLat: i === n - 1 ? destino : [lng, lat],
      t: t0 + i * dt,
      speed: parked ? 0 : 11,
    });
  }
  return out;
}

async function fetchHistorico(
  deviceId: number,
  from: Date,
  to: Date,
  signal?: AbortSignal,
): Promise<PingRecorrido[]> {
  const q = new URLSearchParams({
    deviceId: String(deviceId),
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const res = await fetch(`/api/positions?${q}`, { credentials: "include", signal });
  if (!res.ok) {
    console.warn("estela: histórico Traccar", res.status, res.statusText);
    return [];
  }
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) {
    console.warn("estela: histórico no-JSON");
    return [];
  }
  const raw = (await res.json()) as TraccarPosition[];
  if (!Array.isArray(raw)) return [];
  return pingsDesdeApi(raw);
}

/**
 * Traccar filtra `/positions` por `fixTime`, no por `serverTime`.
 * Si el reloj del GPS va atrasado (días), `now-1h` sale vacío y no hay estela.
 * Ancla al último fix conocido cuando queda fuera de la ventana.
 */
export function ventanaHistorico(
  ventanaMin: VentanaEstelaMin,
  anclaMs?: number,
): { from: Date; to: Date } {
  const ahora = Date.now();
  const span = ventanaMin * 60_000;
  const gpsAtrasado =
    typeof anclaMs === "number" && Number.isFinite(anclaMs) && anclaMs < ahora - span;
  const fin = gpsAtrasado ? (anclaMs as number) : ahora;
  return {
    from: new Date(fin - span),
    to: new Date(gpsAtrasado ? fin + 60_000 : ahora),
  };
}

export async function cargarRecorridoUnidad(
  deviceId: string,
  ventanaMin: VentanaEstelaMin,
  lngLatActual: [number, number] | undefined,
  signal?: AbortSignal,
  anclaMs?: number,
): Promise<RecorridoUnidad> {
  const { from, to } = ventanaHistorico(ventanaMin, anclaMs);
  const numericId = Number(deviceId);
  if (!Number.isFinite(numericId)) {
    if (!lngLatActual) return { coords: [], paradas: [] };
    return armarRecorrido(pingsMock(lngLatActual, ventanaMin));
  }
  const pings = await fetchHistorico(numericId, from, to, signal);
  return armarRecorrido(pings);
}
