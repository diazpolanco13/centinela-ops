import { CARACAS_CENTRO } from "@/data/geo";

export type EstadoUnidad = "en_zona" | "en_ruta" | "detenida" | "sin_senal";

export const COLOR_ESTADO: Record<EstadoUnidad, string> = {
  en_zona: "#14b8a6",
  en_ruta: "#2dd4bf",
  detenida: "#b45309",
  sin_senal: "#64748b",
};

export type UnidadEnMapa = {
  id: string;
  nombre: string;
  estado: EstadoUnidad;
  lngLat: [number, number];
  course: number;
};

export type UnidadMock = UnidadEnMapa;

/** Puntos de muestra alrededor de Caracas. */
export const UNIDADES_MOCK: UnidadMock[] = [
  { id: "u-1", nombre: "Patrulla Alpha", estado: "en_zona", lngLat: [CARACAS_CENTRO[0] - 0.02, CARACAS_CENTRO[1] + 0.015], course: 40 },
  { id: "u-2", nombre: "Patrulla Bravo", estado: "en_ruta", lngLat: [CARACAS_CENTRO[0] + 0.03, CARACAS_CENTRO[1] - 0.01], course: 210 },
  { id: "u-3", nombre: "Patrulla Charlie", estado: "detenida", lngLat: [CARACAS_CENTRO[0] + 0.01, CARACAS_CENTRO[1] + 0.025], course: 95 },
];
