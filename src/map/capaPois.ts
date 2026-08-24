import type {
  CircleLayerSpecification,
  ExpressionSpecification,
  Map as MapLibreMap,
  SymbolLayerSpecification,
} from "maplibre-gl";
import {
  FUENTE_OPENFREEMAP_URL,
  ID_FUENTE_EDIFICIOS_3D,
} from "@/map/estiloMapa";
import { ID_CAPA_UNIDADES_HIT } from "@/map/capaUnidades";

export const ID_CAPA_POIS_DOT = "pois-dot";
export const ID_CAPA_POIS_LABEL = "pois-label";

const COLOR_CLASE: ExpressionSpecification = [
  "match",
  ["get", "class"],
  ["restaurant", "fast_food", "cafe", "bar", "biergarten", "ice_cream"],
  "#f97316",
  ["shop", "grocery", "clothes", "furniture", "laundry", "copyshop", "books"],
  "#3b82f6",
  ["hospital", "pharmacy", "dentist", "doctor"],
  "#ef4444",
  ["school", "college", "university", "library"],
  "#a855f7",
  ["park", "cemetery", "golf", "stadium", "pitch", "picnic_site"],
  "#22c55e",
  ["bus", "rail", "airport", "harbor", "aerialway", "ferry"],
  "#0ea5e9",
  ["lodging", "campsite"],
  "#ec4899",
  ["fuel", "parking"],
  "#64748b",
  ["town_hall", "townhall", "police", "fire_station", "post", "embassy"],
  "#eab308",
  ["attraction", "museum", "monument", "place_of_worship", "zoo", "cinema"],
  "#e879f9",
  "#facc15",
];

const RANK: ExpressionSpecification = ["coalesce", ["get", "rank"], 99];

type Banda = {
  sufijo: string;
  minzoom: number;
  rankMin: number;
  rankMaxExcl: number | null;
};

const BANDAS: Banda[] = [
  { sufijo: "maj", minzoom: 14, rankMin: 0, rankMaxExcl: 7 },
  { sufijo: "mid", minzoom: 15, rankMin: 7, rankMaxExcl: 20 },
  { sufijo: "min", minzoom: 16, rankMin: 20, rankMaxExcl: null },
];

function filtroBanda(b: Banda): ExpressionSpecification {
  const conds: ExpressionSpecification[] = [
    ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
    ["any", ["has", "name"], ["has", "name:latin"]],
    [">=", RANK, b.rankMin],
  ];
  if (b.rankMaxExcl != null) conds.push(["<", RANK, b.rankMaxExcl]);
  return ["all", ...conds];
}

function idsCapas(): string[] {
  return BANDAS.flatMap((b) => [
    `${ID_CAPA_POIS_DOT}-${b.sufijo}`,
    `${ID_CAPA_POIS_LABEL}-${b.sufijo}`,
  ]);
}

const IDS_CAPAS = idsCapas();

function beforeUnidades(map: MapLibreMap): string | undefined {
  return map.getLayer(ID_CAPA_UNIDADES_HIT) ? ID_CAPA_UNIDADES_HIT : undefined;
}

function asegurarFuente(map: MapLibreMap): void {
  if (map.getSource(ID_FUENTE_EDIFICIOS_3D)) return;
  map.addSource(ID_FUENTE_EDIFICIOS_3D, {
    type: "vector",
    url: FUENTE_OPENFREEMAP_URL,
  });
}

function capaDot(id: string, b: Banda): CircleLayerSpecification {
  return {
    id,
    type: "circle",
    source: ID_FUENTE_EDIFICIOS_3D,
    "source-layer": "poi",
    minzoom: b.minzoom,
    filter: filtroBanda(b),
    layout: { visibility: "visible" },
    paint: {
      "circle-color": COLOR_CLASE,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 3.2, 17, 5],
      "circle-opacity": 0.92,
      "circle-stroke-width": 1.1,
      "circle-stroke-color": "#0b1220",
    },
  };
}

function capaLabel(id: string, b: Banda): SymbolLayerSpecification {
  return {
    id,
    type: "symbol",
    source: ID_FUENTE_EDIFICIOS_3D,
    "source-layer": "poi",
    minzoom: b.minzoom,
    filter: filtroBanda(b),
    layout: {
      visibility: "visible",
      "text-field": ["coalesce", ["get", "name:latin"], ["get", "name"]],
      "text-font": ["Open Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 14, 10, 17, 12],
      "text-anchor": "top",
      "text-offset": [0, 0.85],
      "text-max-width": 8,
      "text-padding": 2,
      "text-optional": true,
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#f8fafc",
      "text-halo-color": "#0b1220",
      "text-halo-width": 1.35,
      "text-halo-blur": 0.2,
    },
  };
}

function asegurarCapas(map: MapLibreMap): void {
  const before = beforeUnidades(map);
  for (const b of BANDAS) {
    const idDot = `${ID_CAPA_POIS_DOT}-${b.sufijo}`;
    if (!map.getLayer(idDot)) map.addLayer(capaDot(idDot, b), before);
  }
  for (const b of BANDAS) {
    const idLab = `${ID_CAPA_POIS_LABEL}-${b.sufijo}`;
    if (!map.getLayer(idLab)) map.addLayer(capaLabel(idLab, b), before);
  }
}

function setVisibilidad(map: MapLibreMap, vis: "visible" | "none"): void {
  for (const id of IDS_CAPAS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
  }
}

/** Overlay OSM POI (OpenFreeMap). Debajo de unidades. Idempotente. */
export function aplicarPois(map: MapLibreMap, visible: boolean): void {
  try {
    if (!visible) {
      setVisibilidad(map, "none");
      return;
    }
    asegurarFuente(map);
    asegurarCapas(map);
    setVisibilidad(map, "visible");
  } catch (err) {
    console.warn("pois: overlay no se pudo aplicar", err);
  }
}
