import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type {
  CircleLayerSpecification,
  ExpressionSpecification,
  GeoJSONSource,
  LineLayerSpecification,
  Map as MapLibreMap,
} from "maplibre-gl";
import { LngLatBounds } from "maplibre-gl";
import { ID_CAPA_UNIDADES_HIT } from "@/map/capaUnidades";
import { ID_CAPA_UNIDADES_3D } from "@/map/capaUnidades3d";
import { ID_CAPA_EDIFICIOS_3D } from "@/map/estiloMapa";
import type { ParadaEstela } from "@/data/recorridoUnidad";
import { anchoOverlayIzquierdo } from "@/map/overlayMapa";

export const ID_FUENTE_ESTELA = "estela";
export const ID_CAPA_ESTELA_HALO = "estela-halo";
export const ID_CAPA_ESTELA_GLOW = "estela-glow";
export const ID_CAPA_ESTELA_CORE = "estela-core";
export const ID_CAPA_ESTELA_STOPS = "estela-stops";

const IDS_LINEA = [ID_CAPA_ESTELA_HALO, ID_CAPA_ESTELA_GLOW, ID_CAPA_ESTELA_CORE] as const;
const IDS_ESTELA = new Set<string>([...IDS_LINEA, ID_CAPA_ESTELA_STOPS]);

const REVEAL_MS = 520;
const FADE_MS = 280;
const DASH_PASO_MS = 110;

const VACIO: FeatureCollection = { type: "FeatureCollection", features: [] };

const GRADIENTE_HALO: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["line-progress"],
  0,
  "rgba(0,229,255,0)",
  0.4,
  "rgba(0,229,255,0.12)",
  0.75,
  "rgba(0,229,255,0.4)",
  1,
  "rgba(0,229,255,0.65)",
];

const GRADIENTE_GLOW: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["line-progress"],
  0,
  "rgba(0,229,255,0)",
  0.35,
  "rgba(0,229,255,0.35)",
  0.7,
  "#00E5FF",
  1,
  "#7AFFFF",
];

const GRADIENTE_CORE: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["line-progress"],
  0,
  "rgba(0,229,255,0)",
  0.45,
  "#00E5FF",
  0.82,
  "#B8FFFF",
  1,
  "#FFFFFF",
];

/** Marching ants: flujo cola → cabeza. */
const DASH_SEQ: number[][] = [
  [0, 3.2, 1.1],
  [0.4, 3.2, 0.7],
  [0.8, 3.2, 0.3],
  [0, 0.4, 1.1, 2.8],
  [0, 0.8, 1.1, 2.4],
  [0, 1.2, 1.1, 2],
  [0, 1.6, 1.1, 1.6],
  [0, 2, 1.1, 1.2],
  [0, 2.4, 1.1, 0.8],
  [0, 2.8, 1.1, 0.4],
];

/** ~12 m en lat Caracas: commit breadcrumb, no explotar puntos. */
const APPEND_DEG2 = 0.00011 * 0.00011;
const MAX_COORDS_LIVE = 1200;

type MotorEstela = {
  abort: AbortController | null;
  revealRaf: number;
  dashRaf: number;
  fadeRaf: number;
  deviceId: string | null;
  coords: [number, number][];
  paradas: ParadaEstela[];
  gen: number;
  /** Último vértice es tip live (se mueve); si no, es ping histórico. */
  liveTip: boolean;
};

const motores = new WeakMap<MapLibreMap, MotorEstela>();

function motorDe(map: MapLibreMap): MotorEstela {
  let m = motores.get(map);
  if (m) return m;
  m = {
    abort: null,
    revealRaf: 0,
    dashRaf: 0,
    fadeRaf: 0,
    deviceId: null,
    coords: [],
    paradas: [],
    gen: 0,
    liveTip: false,
  };
  motores.set(map, m);
  return m;
}

function cancelarRaf(id: number): void {
  if (id) cancelAnimationFrame(id);
}

function pararAnimaciones(m: MotorEstela): void {
  cancelarRaf(m.revealRaf);
  cancelarRaf(m.dashRaf);
  cancelarRaf(m.fadeRaf);
  m.revealRaf = 0;
  m.dashRaf = 0;
  m.fadeRaf = 0;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function geojsonEstela(
  coords: [number, number][],
  paradas: ParadaEstela[],
): FeatureCollection {
  const features: Feature<LineString | Point>[] = [];
  if (coords.length >= 2) {
    features.push({
      type: "Feature",
      properties: { kind: "linea" },
      geometry: { type: "LineString", coordinates: coords },
    });
  }
  for (const p of paradas) {
    features.push({
      type: "Feature",
      properties: { kind: "parada" },
      geometry: { type: "Point", coordinates: p.lngLat },
    });
  }
  return { type: "FeatureCollection", features };
}

function setDataFuente(map: MapLibreMap, data: FeatureCollection): void {
  const src = map.getSource(ID_FUENTE_ESTELA) as GeoJSONSource | undefined;
  src?.setData(data);
}

function setOpacidad(map: MapLibreMap, o: number): void {
  const clamp = Math.max(0, Math.min(1, o));
  if (map.getLayer(ID_CAPA_ESTELA_HALO)) {
    map.setPaintProperty(ID_CAPA_ESTELA_HALO, "line-opacity", clamp * 0.7);
  }
  if (map.getLayer(ID_CAPA_ESTELA_GLOW)) {
    map.setPaintProperty(ID_CAPA_ESTELA_GLOW, "line-opacity", clamp);
  }
  if (map.getLayer(ID_CAPA_ESTELA_CORE)) {
    map.setPaintProperty(ID_CAPA_ESTELA_CORE, "line-opacity", clamp);
  }
  if (map.getLayer(ID_CAPA_ESTELA_STOPS)) {
    map.setPaintProperty(ID_CAPA_ESTELA_STOPS, "circle-opacity", clamp * 0.42);
    map.setPaintProperty(ID_CAPA_ESTELA_STOPS, "circle-stroke-opacity", clamp * 0.75);
  }
}

function limpiarDash(map: MapLibreMap): void {
  if (!map.getLayer(ID_CAPA_ESTELA_CORE)) return;
  map.setPaintProperty(ID_CAPA_ESTELA_CORE, "line-dasharray", undefined as unknown as number[]);
}

function arrancarDash(map: MapLibreMap, m: MotorEstela): void {
  cancelarRaf(m.dashRaf);
  m.dashRaf = 0;
  if (!map.getLayer(ID_CAPA_ESTELA_CORE)) return;
  let last = 0;
  let step = 0;
  const tick = (now: number) => {
    m.dashRaf = requestAnimationFrame(tick);
    if (now - last < DASH_PASO_MS) return;
    last = now;
    if (!map.getStyle() || !map.getLayer(ID_CAPA_ESTELA_CORE)) return;
    map.setPaintProperty(ID_CAPA_ESTELA_CORE, "line-dasharray", DASH_SEQ[step]);
    step = (step + 1) % DASH_SEQ.length;
  };
  m.dashRaf = requestAnimationFrame(tick);
}

function paddingEstela(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const left = Math.round(anchoOverlayIzquierdo() + 28);
  return { top: 88, bottom: 140, left: Math.max(56, left), right: 80 };
}

export function encuadrarEstela(map: MapLibreMap, coords: [number, number][]): void {
  if (coords.length < 2) return;
  const b = new LngLatBounds(coords[0], coords[0]);
  for (const c of coords) b.extend(c);
  map.fitBounds(b, {
    padding: paddingEstela(),
    duration: 700,
    maxZoom: 16,
    essential: true,
  });
}

function primerSymbolId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (IDS_ESTELA.has(layer.id)) continue;
    if (layer.type === "symbol") return layer.id;
  }
  return undefined;
}

/**
 * Google/Uber: línea al suelo, edificios la tapan, labels encima.
 * `addLayer(..., edificios-3d)` = antes de extrusión y del primer symbol.
 * Sin 3D (híbrido/OSM): primer symbol o hit.
 */
function beforeIdEstela(map: MapLibreMap): string | undefined {
  if (map.getLayer(ID_CAPA_EDIFICIOS_3D)) return ID_CAPA_EDIFICIOS_3D;
  return (
    primerSymbolId(map) ??
    (map.getLayer(ID_CAPA_UNIDADES_HIT) ? ID_CAPA_UNIDADES_HIT : undefined) ??
    (map.getLayer(ID_CAPA_UNIDADES_3D) ? ID_CAPA_UNIDADES_3D : undefined)
  );
}

function specHalo(): LineLayerSpecification {
  return {
    id: ID_CAPA_ESTELA_HALO,
    type: "line",
    source: ID_FUENTE_ESTELA,
    filter: ["==", ["geometry-type"], "LineString"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-width": 22,
      "line-blur": 16,
      "line-gradient": GRADIENTE_HALO,
      "line-opacity": 0.7,
    },
  };
}

function specGlow(): LineLayerSpecification {
  return {
    id: ID_CAPA_ESTELA_GLOW,
    type: "line",
    source: ID_FUENTE_ESTELA,
    filter: ["==", ["geometry-type"], "LineString"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-width": 8,
      "line-blur": 3,
      "line-gradient": GRADIENTE_GLOW,
      "line-opacity": 1,
    },
  };
}

function specCore(): LineLayerSpecification {
  return {
    id: ID_CAPA_ESTELA_CORE,
    type: "line",
    source: ID_FUENTE_ESTELA,
    filter: ["==", ["geometry-type"], "LineString"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-width": 2.5,
      "line-gradient": GRADIENTE_CORE,
      "line-opacity": 1,
    },
  };
}

function specStops(): CircleLayerSpecification {
  return {
    id: ID_CAPA_ESTELA_STOPS,
    type: "circle",
    source: ID_FUENTE_ESTELA,
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-radius": 5.5,
      "circle-color": "#00E5FF",
      "circle-blur": 0.55,
      "circle-opacity": 0.42,
      "circle-stroke-width": 1.2,
      "circle-stroke-color": "#7AFFFF",
      "circle-stroke-opacity": 0.75,
    },
  };
}

/** Idempotente. No duplica source. Reordena si ya existe. */
export function asegurarCapaEstela(map: MapLibreMap): void {
  if (!map.getStyle()) return;
  if (!map.getSource(ID_FUENTE_ESTELA)) {
    map.addSource(ID_FUENTE_ESTELA, {
      type: "geojson",
      lineMetrics: true,
      data: VACIO,
    });
  }
  const before = beforeIdEstela(map);
  const specs = [specHalo(), specGlow(), specCore(), specStops()] as const;
  for (const spec of specs) {
    if (!map.getLayer(spec.id)) {
      map.addLayer(spec, before);
    }
  }
  for (const spec of specs) {
    if (map.getLayer(spec.id) && before && before !== spec.id) {
      map.moveLayer(spec.id, before);
    }
  }
}

function pintar(
  map: MapLibreMap,
  coords: [number, number][],
  paradas: ParadaEstela[],
): void {
  setDataFuente(map, geojsonEstela(coords, paradas));
}

function revelar(
  map: MapLibreMap,
  m: MotorEstela,
  coords: [number, number][],
  paradas: ParadaEstela[],
): void {
  cancelarRaf(m.revealRaf);
  m.revealRaf = 0;
  const n = coords.length;
  if (n < 2) {
    pintar(map, [], []);
    return;
  }
  const t0 = performance.now();
  const tick = (now: number) => {
    const u = easeOutCubic(Math.min(1, (now - t0) / REVEAL_MS));
    const count = Math.max(2, Math.ceil(u * n));
    pintar(map, coords.slice(0, count), u >= 1 ? paradas : []);
    if (u < 1) {
      m.revealRaf = requestAnimationFrame(tick);
      return;
    }
    m.revealRaf = 0;
    pintar(map, m.coords, m.paradas);
    arrancarDash(map, m);
  };
  m.revealRaf = requestAnimationFrame(tick);
}

function dist2(a: [number, number], b: [number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

function mismoPunto(a: [number, number], b: [number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Pega o alarga la cabeza hasta lngLat. Mutates motor.coords. */
function pegarCabeza(m: MotorEstela, lngLat: [number, number]): void {
  if (m.coords.length === 0) {
    m.coords.push(lngLat);
    m.liveTip = true;
    return;
  }
  const last = m.coords[m.coords.length - 1];
  if (mismoPunto(last, lngLat)) {
    m.liveTip = true;
    return;
  }
  const ancla = m.liveTip && m.coords.length >= 2 ? m.coords[m.coords.length - 2] : last;
  if (m.liveTip) {
    if (dist2(ancla, lngLat) >= APPEND_DEG2) {
      m.coords.push(lngLat);
      if (m.coords.length > MAX_COORDS_LIVE) {
        m.coords.splice(0, m.coords.length - MAX_COORDS_LIVE);
      }
    } else {
      m.coords[m.coords.length - 1] = lngLat;
    }
    return;
  }
  m.coords.push(lngLat);
  m.liveTip = true;
}

/**
 * Extiende la estela al GPS live. No refetch. No reveal. No fitBounds.
 * Durante reveal solo muta coords; el tick final pinta la cabeza.
 */
export function seguirCabezaEstela(
  map: MapLibreMap,
  deviceId: string,
  lngLat: [number, number],
): void {
  const m = motores.get(map);
  if (!m || m.deviceId !== deviceId || m.fadeRaf) return;
  if (!Number.isFinite(lngLat[0]) || !Number.isFinite(lngLat[1])) return;
  const last = m.coords[m.coords.length - 1];
  if (last && mismoPunto(last, lngLat) && m.liveTip) return;
  pegarCabeza(m, lngLat);
  if (m.revealRaf) return;
  if (m.coords.length < 2) return;
  if (!map.getStyle() || !map.getSource(ID_FUENTE_ESTELA)) return;
  pintar(map, m.coords, m.paradas);
}

export function mostrarEstela(
  map: MapLibreMap,
  coords: [number, number][],
  paradas: ParadaEstela[],
  opts?: { fit?: boolean; cabeza?: [number, number] },
): void {
  if (!map.getStyle()) return;
  asegurarCapaEstela(map);
  const m = motorDe(map);
  pararAnimaciones(m);
  limpiarDash(map);
  setOpacidad(map, 1);
  m.coords = coords;
  m.paradas = paradas;
  m.liveTip = false;
  if (opts?.cabeza) pegarCabeza(m, opts.cabeza);
  if (m.coords.length < 2) {
    pintar(map, [], []);
    return;
  }
  if (opts?.fit !== false) encuadrarEstela(map, m.coords);
  revelar(map, m, m.coords, paradas);
}

export function ocultarEstela(map: MapLibreMap): void {
  const m = motores.get(map);
  if (m) {
    m.gen += 1;
    m.abort?.abort();
    m.abort = null;
    m.deviceId = null;
    m.coords = [];
    m.paradas = [];
    m.liveTip = false;
    pararAnimaciones(m);
  }
  if (!map.getStyle() || !map.getSource(ID_FUENTE_ESTELA)) return;

  const t0 = performance.now();
  const tick = (now: number) => {
    if (!motores.get(map)) return;
    const u = Math.min(1, (now - t0) / FADE_MS);
    setOpacidad(map, 1 - u);
    if (u < 1) {
      motorDe(map).fadeRaf = requestAnimationFrame(tick);
      return;
    }
    const cur = motorDe(map);
    cur.fadeRaf = 0;
    setDataFuente(map, VACIO);
    setOpacidad(map, 1);
    limpiarDash(map);
  };
  motorDe(map).fadeRaf = requestAnimationFrame(tick);
}

/** Tras setStyle (Carto / híbrido / OSM). Restaura si hay coords. */
export function reinyectarEstela(map: MapLibreMap): void {
  if (!map.getStyle()) return;
  asegurarCapaEstela(map);
  const m = motores.get(map);
  if (!m || m.coords.length < 2) {
    setDataFuente(map, VACIO);
    return;
  }
  setOpacidad(map, 1);
  pintar(map, m.coords, m.paradas);
  arrancarDash(map, m);
}

export function reservarCargaEstela(map: MapLibreMap, deviceId: string): AbortSignal {
  const m = motorDe(map);
  m.abort?.abort();
  m.abort = new AbortController();
  m.gen += 1;
  m.deviceId = deviceId;
  pararAnimaciones(m);
  return m.abort.signal;
}

export function cargaEstelaVigente(map: MapLibreMap, deviceId: string): boolean {
  const m = motores.get(map);
  return m?.deviceId === deviceId && !m.abort?.signal.aborted;
}

export function destruirEstela(map: MapLibreMap): void {
  const m = motores.get(map);
  if (!m) return;
  m.abort?.abort();
  pararAnimaciones(m);
  motores.delete(map);
}
