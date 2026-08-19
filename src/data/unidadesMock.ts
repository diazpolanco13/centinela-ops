import { CARACAS_CENTRO } from "@/data/geo";

export type UnidadMock = {
  id: string;
  nombre: string;
  estado: "en_zona" | "en_ruta" | "detenida";
  lngLat: [number, number];
};

/** Puntos de muestra alrededor de Caracas. */
export const UNIDADES_MOCK: UnidadMock[] = [
  { id: "u-1", nombre: "Patrulla Alpha", estado: "en_zona", lngLat: [CARACAS_CENTRO[0] - 0.02, CARACAS_CENTRO[1] + 0.015] },
  { id: "u-2", nombre: "Patrulla Bravo", estado: "en_ruta", lngLat: [CARACAS_CENTRO[0] + 0.03, CARACAS_CENTRO[1] - 0.01] },
  { id: "u-3", nombre: "Patrulla Charlie", estado: "detenida", lngLat: [CARACAS_CENTRO[0] + 0.01, CARACAS_CENTRO[1] + 0.025] },
];
