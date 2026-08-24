import { CARACAS_CENTRO } from "@/data/geo";

export type EstadoUnidad = "en_zona" | "en_ruta" | "detenida" | "sin_senal";

export const COLOR_ESTADO: Record<EstadoUnidad, string> = {
  en_zona: "#14b8a6",
  en_ruta: "#2dd4bf",
  detenida: "#b45309",
  sin_senal: "#64748b",
};

export type TelemetriaUnidad = {
  speedKn: number;
  motion: boolean | null;
  ignition: boolean | null;
  batteryV?: number;
  lastFixMs?: number;
  lastUpdateMs?: number;
  lastMotionMs?: number;
  category?: string;
  alarm?: string;
  fotoUrl?: string;
};

export type UnidadEnMapa = {
  id: string;
  nombre: string;
  estado: EstadoUnidad;
  lngLat: [number, number];
  course: number;
  telemetria?: TelemetriaUnidad;
};

export type UnidadMock = UnidadEnMapa;

const haceMin = (min: number) => Date.now() - min * 60_000;

function tel(
  estado: EstadoUnidad,
  extras?: Partial<TelemetriaUnidad>,
): TelemetriaUnidad {
  const enRuta = estado === "en_ruta";
  const sinSenal = estado === "sin_senal";
  return {
    speedKn: enRuta ? 16 : 0,
    motion: enRuta,
    ignition: estado !== "detenida" && !sinSenal,
    category: "car",
    lastFixMs: haceMin(sinSenal ? 40 : enRuta ? 0.3 : 4),
    lastUpdateMs: haceMin(sinSenal ? 40 : enRuta ? 0.3 : 4),
    lastMotionMs: haceMin(enRuta ? 0 : 18),
    ...extras,
  };
}

function u(
  id: string,
  nombre: string,
  estado: EstadoUnidad,
  dlng: number,
  dlat: number,
  course: number,
  extras?: Partial<TelemetriaUnidad>,
): UnidadMock {
  return {
    id,
    nombre,
    estado,
    lngLat: [CARACAS_CENTRO[0] + dlng, CARACAS_CENTRO[1] + dlat],
    course,
    telemetria: tel(estado, extras),
  };
}

/** Puntos de muestra alrededor de Caracas (grupos cercanos para clustering). */
export const UNIDADES_MOCK: UnidadMock[] = [
  u("u-1", "Patrulla Alpha", "en_zona", -0.02, 0.015, 40, {
    speedKn: 0,
    motion: false,
    ignition: true,
    lastFixMs: haceMin(4),
    lastUpdateMs: haceMin(4),
    lastMotionMs: haceMin(18),
  }),
  u("u-4", "Patrulla Delta", "en_ruta", -0.018, 0.014, 30),
  u("u-5", "Patrulla Echo", "en_zona", -0.021, 0.017, 85),
  u("u-2", "Patrulla Bravo", "en_ruta", 0.03, -0.01, 210, {
    speedKn: 18,
    motion: true,
    ignition: true,
    lastFixMs: haceMin(0.2),
    lastUpdateMs: haceMin(0.2),
    lastMotionMs: Date.now(),
  }),
  u("u-6", "Patrulla Foxtrot", "en_ruta", 0.032, -0.008, 190),
  u("u-7", "Patrulla Golf", "detenida", 0.028, -0.012, 175),
  u("u-8", "Patrulla Hotel", "en_zona", 0.031, -0.011, 200),
  u("u-3", "Patrulla Charlie", "detenida", 0.01, 0.025, 95, {
    speedKn: 0,
    motion: false,
    ignition: false,
    batteryV: 3.4,
    lastFixMs: haceMin(40),
    lastUpdateMs: haceMin(40),
    lastMotionMs: haceMin(95),
  }),
  u("u-9", "Patrulla India", "en_zona", 0.012, 0.024, 110),
  u("u-10", "Patrulla Juliet", "sin_senal", 0.009, 0.027, 70),
  u("u-11", "Patrulla Kilo", "en_ruta", -0.04, -0.02, 320),
  u("u-12", "Patrulla Lima", "en_zona", -0.038, -0.018, 300),
  u("u-13", "Patrulla Mike", "detenida", -0.041, -0.021, 280),
  u("u-14", "Patrulla November", "en_ruta", 0.05, 0.02, 45),
  u("u-15", "Patrulla Oscar", "sin_senal", -0.01, -0.03, 15),
];
