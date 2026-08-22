import type { FeatureCollection } from "geojson";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent,
} from "maplibre-gl";
import { etiquetaCorta } from "@/data/traccar";
import { COLOR_ESTADO, type UnidadEnMapa } from "@/data/unidadesMock";
import {
  asegurarIconosUnidad,
  idIconoApple,
  idIconoPuck,
  prepararIconosUnidad,
  reemplazarIconosUnidad,
} from "@/map/iconosUnidad";
import { montarCapaUnidades3d, setDataUnidades3d } from "@/map/capaUnidades3d";

export { COLOR_ESTADO };

export const ID_FUENTE_UNIDADES = "unidades";
export const ID_CAPA_UNIDADES_PUCK = "unidades-puck";
export const ID_CAPA_UNIDADES_APPLE = "unidades-apple";
export const ID_CAPA_UNIDADES_LABEL = "unidades-label";
export const ID_CAPA_UNIDADES_LABEL_SEL = "unidades-label-sel";

const VACIO: FeatureCollection = { type: "FeatureCollection", features: [] };

const ICONO_PUCK_POR_ESTADO: ExpressionSpecification = [
  "match",
  ["get", "estado"],
  "en_zona",
  idIconoPuck("en_zona"),
  "en_ruta",
  idIconoPuck("en_ruta"),
  "detenida",
  idIconoPuck("detenida"),
  "sin_senal",
  idIconoPuck("sin_senal"),
  idIconoPuck("en_ruta"),
];

const ICONO_APPLE_POR_ESTADO: ExpressionSpecification = [
  "match",
  ["get", "estado"],
  "en_zona",
  idIconoApple("en_zona"),
  "en_ruta",
  idIconoApple("en_ruta"),
  "detenida",
  idIconoApple("detenida"),
  "sin_senal",
  idIconoApple("sin_senal"),
  idIconoApple("en_ruta"),
];

export function geojsonUnidades(
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: unidades.map((u) => ({
      type: "Feature" as const,
      id: u.id,
      geometry: { type: "Point" as const, coordinates: u.lngLat },
      properties: {
        id: u.id,
        nombre: u.nombre,
        etiqueta: etiquetaCorta(u.nombre),
        estado: u.estado,
        course: u.course ?? 0,
        seleccionada: u.id === selectedId ? 1 : 0,
      },
    })),
  };
}

/** Sprite 80px. Punto medio: se lee el auto, no tapa manzana. */
const TAM_PUCK: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  0.34,
  12,
  0.46,
  14,
  0.6,
  16,
  0.76,
  18,
  0.92,
];

const TAM_APPLE: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  0.44,
  12,
  0.58,
  14,
  0.74,
  16,
  0.92,
  18,
  1.08,
];

const TAM_LABEL: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  14,
  8,
  17,
  10,
];

const ICON_ROTATE: ExpressionSpecification = [
  "to-number",
  ["coalesce", ["get", "course"], 0],
];

function syncLayoutUnidades(map: MapLibreMap): void {
  if (map.getLayer(ID_CAPA_UNIDADES_PUCK)) {
    map.setLayoutProperty(ID_CAPA_UNIDADES_PUCK, "icon-image", ICONO_PUCK_POR_ESTADO);
    map.setLayoutProperty(ID_CAPA_UNIDADES_PUCK, "icon-size", TAM_PUCK);
    map.setLayoutProperty(ID_CAPA_UNIDADES_PUCK, "icon-rotate", ICON_ROTATE);
    map.setLayoutProperty(ID_CAPA_UNIDADES_PUCK, "icon-rotation-alignment", "map");
    map.setLayoutProperty(ID_CAPA_UNIDADES_PUCK, "icon-pitch-alignment", "map");
    map.setPaintProperty(ID_CAPA_UNIDADES_PUCK, "icon-opacity", 1);
  }
  if (map.getLayer(ID_CAPA_UNIDADES_APPLE)) {
    map.setLayoutProperty(ID_CAPA_UNIDADES_APPLE, "icon-image", ICONO_APPLE_POR_ESTADO);
    map.setLayoutProperty(ID_CAPA_UNIDADES_APPLE, "icon-size", TAM_APPLE);
    map.setLayoutProperty(ID_CAPA_UNIDADES_APPLE, "icon-rotate", ICON_ROTATE);
    map.setLayoutProperty(ID_CAPA_UNIDADES_APPLE, "icon-rotation-alignment", "map");
    map.setLayoutProperty(ID_CAPA_UNIDADES_APPLE, "icon-pitch-alignment", "map");
    map.setLayoutProperty(ID_CAPA_UNIDADES_APPLE, "icon-anchor", "center");
    map.setPaintProperty(ID_CAPA_UNIDADES_APPLE, "icon-opacity", 1);
  }
  if (map.getLayer(ID_CAPA_UNIDADES_LABEL)) {
    map.setLayoutProperty(ID_CAPA_UNIDADES_LABEL, "text-size", TAM_LABEL);
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL, "text-color", "#5eead4");
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL, "text-opacity", 0.72);
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL, "text-halo-color", "#041410");
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL, "text-halo-width", 1.1);
    map.setLayerZoomRange(ID_CAPA_UNIDADES_LABEL, 16, 24);
  }
  if (map.getLayer(ID_CAPA_UNIDADES_LABEL_SEL)) {
    map.setLayoutProperty(ID_CAPA_UNIDADES_LABEL_SEL, "text-offset", [0, 1.65]);
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL_SEL, "text-color", "#f0fdfa");
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL_SEL, "text-halo-width", 1.4);
  }
}

function capasClic(map: MapLibreMap): string[] {
  return [ID_CAPA_UNIDADES_PUCK, ID_CAPA_UNIDADES_APPLE].filter((id) => map.getLayer(id));
}

export function asegurarCapaUnidades(map: MapLibreMap): boolean {
  if (!asegurarIconosUnidad(map)) return false;

  if (!map.getSource(ID_FUENTE_UNIDADES)) {
    map.addSource(ID_FUENTE_UNIDADES, {
      type: "geojson",
      data: VACIO,
    });
  }

  if (!map.getLayer(ID_CAPA_UNIDADES_PUCK)) {
    map.addLayer({
      id: ID_CAPA_UNIDADES_PUCK,
      type: "symbol",
      source: ID_FUENTE_UNIDADES,
      filter: ["==", ["get", "seleccionada"], 0],
      layout: {
        "icon-image": ICONO_PUCK_POR_ESTADO,
        "icon-size": TAM_PUCK,
        "icon-rotate": ICON_ROTATE,
        "icon-rotation-alignment": "map",
        "icon-pitch-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-anchor": "center",
      },
      paint: {
        "icon-opacity": 1,
      },
    });
  }

  if (!map.getLayer(ID_CAPA_UNIDADES_APPLE)) {
    map.addLayer({
      id: ID_CAPA_UNIDADES_APPLE,
      type: "symbol",
      source: ID_FUENTE_UNIDADES,
      filter: ["==", ["get", "seleccionada"], 1],
      layout: {
        "icon-image": ICONO_APPLE_POR_ESTADO,
        "icon-size": TAM_APPLE,
        "icon-rotate": ICON_ROTATE,
        "icon-rotation-alignment": "map",
        "icon-pitch-alignment": "map",
        "icon-anchor": "center",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": 1,
      },
    });
  }

  if (!map.getLayer(ID_CAPA_UNIDADES_LABEL)) {
    map.addLayer({
      id: ID_CAPA_UNIDADES_LABEL,
      type: "symbol",
      source: ID_FUENTE_UNIDADES,
      minzoom: 16,
      filter: ["==", ["get", "seleccionada"], 0],
      layout: {
        "text-field": ["get", "etiqueta"],
        "text-size": TAM_LABEL,
        "text-font": ["Open Sans Regular"],
        "text-offset": [0, 0.95],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "text-optional": true,
      },
      paint: {
        "text-color": "#5eead4",
        "text-opacity": 0.72,
        "text-halo-color": "#041410",
        "text-halo-width": 1.1,
      },
    });
  }

  if (!map.getLayer(ID_CAPA_UNIDADES_LABEL_SEL)) {
    map.addLayer({
      id: ID_CAPA_UNIDADES_LABEL_SEL,
      type: "symbol",
      source: ID_FUENTE_UNIDADES,
      filter: ["==", ["get", "seleccionada"], 1],
      layout: {
        "text-field": ["get", "nombre"],
        "text-size": 11,
        "text-font": ["Open Sans Regular"],
        "text-offset": [0, 1.65],
        "text-anchor": "top",
        "text-allow-overlap": true,
        "text-max-width": 14,
      },
      paint: {
        "text-color": "#f0fdfa",
        "text-halo-color": "#041410",
        "text-halo-width": 1.4,
      },
    });
  }

  syncLayoutUnidades(map);
  return true;
}

export function setDataUnidades(
  map: MapLibreMap,
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): void {
  if (!asegurarCapaUnidades(map)) {
    void montarCapaUnidades(map, unidades, selectedId);
    return;
  }
  const source = map.getSource(ID_FUENTE_UNIDADES) as GeoJSONSource | undefined;
  source?.setData(geojsonUnidades(unidades, selectedId));
  setDataUnidades3d(map, unidades, selectedId);
}

export async function montarCapaUnidades(
  map: MapLibreMap,
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): Promise<void> {
  await prepararIconosUnidad();
  if (!map.getStyle()) return;
  reemplazarIconosUnidad(map);
  if (!asegurarCapaUnidades(map)) return;
  const source = map.getSource(ID_FUENTE_UNIDADES) as GeoJSONSource | undefined;
  source?.setData(geojsonUnidades(unidades, selectedId));
  montarCapaUnidades3d(map, unidades, selectedId);
}

export function engancharClicUnidades(
  map: MapLibreMap,
  opts: {
    getUnidades: () => UnidadEnMapa[];
    getSelectedId: () => string | null;
    setSelectedId: (id: string | null) => void;
  },
): () => void {
  const onClick = (e: MapMouseEvent) => {
    const layers = capasClic(map);
    const hits = layers.length
      ? map.queryRenderedFeatures(e.point, { layers })
      : [];
    const id = (hits[0]?.properties?.id as string | undefined) ?? null;
    if (id === opts.getSelectedId()) return;
    opts.setSelectedId(id);
    setDataUnidades(map, opts.getUnidades(), id);
  };

  const onMove = (e: MapMouseEvent) => {
    const layers = capasClic(map);
    if (!layers.length) return;
    const hits = map.queryRenderedFeatures(e.point, { layers });
    map.getCanvas().style.cursor = hits.length ? "pointer" : "";
  };

  map.on("click", onClick);
  map.on("mousemove", onMove);
  return () => {
    map.off("click", onClick);
    map.off("mousemove", onMove);
    map.getCanvas().style.cursor = "";
  };
}
