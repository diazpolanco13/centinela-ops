import type { FeatureCollection } from "geojson";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent,
} from "maplibre-gl";
import { etiquetaCorta } from "@/data/traccar";
import { COLOR_ESTADO, type UnidadEnMapa } from "@/data/unidadesMock";
import { leerPrefsUnidades } from "@/data/preferenciasUnidades";
import { montarCapaUnidades3d, setDataUnidades3d, ID_CAPA_UNIDADES_3D } from "@/map/capaUnidades3d";

export { COLOR_ESTADO };

export const ID_FUENTE_UNIDADES = "unidades";
/** Círculo invisible: hit-test clic (mesh Three no es queryable). */
export const ID_CAPA_UNIDADES_HIT = "unidades-hit";
export const ID_CAPA_UNIDADES_LABEL = "unidades-label";
export const ID_CAPA_UNIDADES_LABEL_SEL = "unidades-label-sel";

const VACIO: FeatureCollection = { type: "FeatureCollection", features: [] };

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

const TAM_LABEL: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  14,
  8,
  17,
  10,
];

function syncLayoutUnidades(map: MapLibreMap): void {
  const prefs = leerPrefsUnidades();
  const visLabels = prefs.labels ? "visible" : "none";

  if (map.getLayer(ID_CAPA_UNIDADES_HIT)) {
    map.setPaintProperty(ID_CAPA_UNIDADES_HIT, "circle-radius", [
      "interpolate",
      ["linear"],
      ["zoom"],
      8,
      14,
      14,
      18,
      18,
      22,
    ]);
  }
  if (map.getLayer(ID_CAPA_UNIDADES_LABEL)) {
    map.setLayoutProperty(ID_CAPA_UNIDADES_LABEL, "visibility", visLabels);
    map.setLayoutProperty(ID_CAPA_UNIDADES_LABEL, "text-size", TAM_LABEL);
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL, "text-color", "#f0fdfa");
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL, "text-opacity", 0.92);
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL, "text-halo-color", "#020617");
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL, "text-halo-width", 1.6);
    map.setLayerZoomRange(ID_CAPA_UNIDADES_LABEL, 14, 24);
  }
  if (map.getLayer(ID_CAPA_UNIDADES_LABEL_SEL)) {
    map.setLayoutProperty(ID_CAPA_UNIDADES_LABEL_SEL, "visibility", visLabels);
    map.setLayoutProperty(ID_CAPA_UNIDADES_LABEL_SEL, "text-offset", [0, 1.65]);
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL_SEL, "text-color", "#f0fdfa");
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL_SEL, "text-halo-color", "#020617");
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL_SEL, "text-halo-width", 1.8);
  }
}

function quitarCapasSpriteLegacy(map: MapLibreMap): void {
  for (const id of ["unidades-puck", "unidades-apple"]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
}

/** Aplica prefs (labels, mesh) y refresca unidades 3D. */
export function aplicarPrefsUnidades(
  map: MapLibreMap,
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): void {
  if (!map.getStyle()) return;
  if (!asegurarCapaUnidades(map)) return;
  syncLayoutUnidades(map);
  const source = map.getSource(ID_FUENTE_UNIDADES) as GeoJSONSource | undefined;
  source?.setData(geojsonUnidades(unidades, selectedId));
  setDataUnidades3d(map, unidades, selectedId);
  map.triggerRepaint();
}

function capasClic(map: MapLibreMap): string[] {
  return [ID_CAPA_UNIDADES_HIT].filter((id) => map.getLayer(id));
}

export function asegurarCapaUnidades(map: MapLibreMap): boolean {
  quitarCapasSpriteLegacy(map);

  if (!map.getSource(ID_FUENTE_UNIDADES)) {
    map.addSource(ID_FUENTE_UNIDADES, {
      type: "geojson",
      data: VACIO,
    });
  }

  if (!map.getLayer(ID_CAPA_UNIDADES_HIT)) {
    map.addLayer({
      id: ID_CAPA_UNIDADES_HIT,
      type: "circle",
      source: ID_FUENTE_UNIDADES,
      paint: {
        "circle-radius": 18,
        "circle-opacity": 0,
        "circle-stroke-width": 0,
      },
    });
  }

  try {
    if (!map.getLayer(ID_CAPA_UNIDADES_LABEL)) {
      map.addLayer({
        id: ID_CAPA_UNIDADES_LABEL,
        type: "symbol",
        source: ID_FUENTE_UNIDADES,
        minzoom: 14,
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
          "text-color": "#f0fdfa",
          "text-opacity": 0.92,
          "text-halo-color": "#020617",
          "text-halo-width": 1.6,
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
          "text-halo-color": "#020617",
          "text-halo-width": 1.8,
        },
      });
    }
  } catch (err) {
    console.warn("labels unidades no se pudieron montar", err);
  }

  syncLayoutUnidades(map);
  return true;
}

export function setDataUnidades(
  map: MapLibreMap,
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): void {
  if (!map.getStyle()) return;
  if (!map.getLayer(ID_CAPA_UNIDADES_3D) || !map.getSource(ID_FUENTE_UNIDADES)) {
    montarCapaUnidades(map, unidades, selectedId);
    return;
  }
  asegurarCapaUnidades(map);
  const source = map.getSource(ID_FUENTE_UNIDADES) as GeoJSONSource | undefined;
  source?.setData(geojsonUnidades(unidades, selectedId));
  setDataUnidades3d(map, unidades, selectedId);
}

export function montarCapaUnidades(
  map: MapLibreMap,
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): void {
  if (!map.getStyle()) return;
  // Hit + source primero; mesh 3D siempre (aunque labels fallen).
  if (!map.getSource(ID_FUENTE_UNIDADES)) {
    map.addSource(ID_FUENTE_UNIDADES, { type: "geojson", data: VACIO });
  }
  if (!map.getLayer(ID_CAPA_UNIDADES_HIT)) {
    map.addLayer({
      id: ID_CAPA_UNIDADES_HIT,
      type: "circle",
      source: ID_FUENTE_UNIDADES,
      paint: {
        "circle-radius": 18,
        "circle-opacity": 0,
        "circle-stroke-width": 0,
      },
    });
  }
  const source = map.getSource(ID_FUENTE_UNIDADES) as GeoJSONSource | undefined;
  source?.setData(geojsonUnidades(unidades, selectedId));
  montarCapaUnidades3d(map, unidades, selectedId);
  asegurarCapaUnidades(map);
  // Labels pueden quedar encima del mesh: reordenar.
  if (map.getLayer(ID_CAPA_UNIDADES_3D) && map.getLayer(ID_CAPA_UNIDADES_LABEL)) {
    map.moveLayer(ID_CAPA_UNIDADES_3D, ID_CAPA_UNIDADES_LABEL);
  }
  map.triggerRepaint();
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

  let moveRaf = 0;
  let movePoint: MapMouseEvent["point"] | null = null;
  const onMove = (e: MapMouseEvent) => {
    movePoint = e.point;
    if (moveRaf) return;
    moveRaf = requestAnimationFrame(() => {
      moveRaf = 0;
      const layers = capasClic(map);
      if (!layers.length || !movePoint) return;
      const hits = map.queryRenderedFeatures(movePoint, { layers });
      map.getCanvas().style.cursor = hits.length ? "pointer" : "";
    });
  };

  map.on("click", onClick);
  map.on("mousemove", onMove);
  return () => {
    map.off("click", onClick);
    map.off("mousemove", onMove);
    if (moveRaf) cancelAnimationFrame(moveRaf);
    map.getCanvas().style.cursor = "";
  };
}
