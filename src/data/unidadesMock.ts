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

/** Puntos de muestra alrededor de Caracas. */
export const UNIDADES_MOCK: UnidadMock[] = [
  {
    id: "u-1",
    nombre: "Patrulla Alpha",
    estado: "en_zona",
    lngLat: [CARACAS_CENTRO[0] - 0.02, CARACAS_CENTRO[1] + 0.015],
    course: 40,
    telemetria: {
      speedKn: 0,
      motion: false,
      ignition: true,
      category: "car",
      lastFixMs: haceMin(4),
      lastUpdateMs: haceMin(4),
      lastMotionMs: haceMin(18),
    },
  },
  {
    id: "u-2",
    nombre: "Patrulla Bravo",
    estado: "en_ruta",
    lngLat: [CARACAS_CENTRO[0] + 0.03, CARACAS_CENTRO[1] - 0.01],
    course: 210,
    telemetria: {
      speedKn: 18,
      motion: true,
      ignition: true,
      category: "car",
      lastFixMs: haceMin(0.2),
      lastUpdateMs: haceMin(0.2),
      lastMotionMs: Date.now(),
    },
  },
  {
    id: "u-3",
    nombre: "Patrulla Charlie",
    estado: "detenida",
    lngLat: [CARACAS_CENTRO[0] + 0.01, CARACAS_CENTRO[1] + 0.025],
    course: 95,
    telemetria: {
      speedKn: 0,
      motion: false,
      ignition: false,
      batteryV: 3.4,
      category: "car",
      lastFixMs: haceMin(40),
      lastUpdateMs: haceMin(40),
      lastMotionMs: haceMin(95),
    },
  },
];
