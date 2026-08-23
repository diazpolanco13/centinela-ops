import type { FeatureCollection, Point } from "geojson";
import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSource,
  GeoJSONSourceSpecification,
  Map as MapLibreMap,
  MapMouseEvent,
  MapSourceDataEvent,
} from "maplibre-gl";
import { etiquetaCorta } from "@/data/traccar";
import { COLOR_ESTADO, type UnidadEnMapa } from "@/data/unidadesMock";
import { leerPrefsAgrupamiento } from "@/data/preferenciasMapa";
import { leerPrefsUnidades } from "@/data/preferenciasUnidades";
import { montarCapaUnidades3d, setDataUnidades3d, ID_CAPA_UNIDADES_3D } from "@/map/capaUnidades3d";

export { COLOR_ESTADO };

export const ID_FUENTE_UNIDADES = "unidades";
/** Círculo invisible: hit-test clic (mesh Three no es queryable). */
export const ID_CAPA_UNIDADES_HIT = "unidades-hit";
export const ID_CAPA_UNIDADES_LABEL = "unidades-label";
export const ID_CAPA_UNIDADES_LABEL_SEL = "unidades-label-sel";
export const ID_CAPA_CLUSTERS = "unidades-clusters";
export const ID_CAPA_CLUSTER_COUNT = "unidades-cluster-count";

const VACIO: FeatureCollection = { type: "FeatureCollection", features: [] };

const FILTRO_HOJA: FilterSpecification = ["!", ["has", "point_count"]];
const FILTRO_CLUSTER: FilterSpecification = ["has", "point_count"];
const FILTRO_LABEL: FilterSpecification = [
  "all",
  ["!", ["has", "point_count"]],
  ["==", ["get", "seleccionada"], 0],
];
const FILTRO_LABEL_SEL: FilterSpecification = [
  "all",
  ["!", ["has", "point_count"]],
  ["==", ["get", "seleccionada"], 1],
];

const CAPAS_FUENTE = [
  ID_CAPA_CLUSTER_COUNT,
  ID_CAPA_CLUSTERS,
  ID_CAPA_UNIDADES_LABEL_SEL,
  ID_CAPA_UNIDADES_LABEL,
  ID_CAPA_UNIDADES_HIT,
] as const;

const claveFuentePorMapa = new WeakMap<MapLibreMap, string>();

export function geojsonUnidades(
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: unidades.map((u) => ({
      type: "Feature" as const,
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

function claveFuenteAgrupamiento(): string {
  const prefs = leerPrefsAgrupamiento();
  if (!prefs.clustering) return "off";
  return `on:${prefs.clusterRadius}:${prefs.clusterMaxZoom}`;
}

function specFuenteUnidades(): GeoJSONSourceSpecification {
  const prefs = leerPrefsAgrupamiento();
  return {
    type: "geojson",
    data: VACIO,
    generateId: true,
    ...(prefs.clustering
      ? {
          cluster: true,
          clusterRadius: prefs.clusterRadius,
          clusterMaxZoom: prefs.clusterMaxZoom,
        }
      : {}),
  };
}

function quitarCapasYFuenteUnidades(map: MapLibreMap): void {
  for (const id of CAPAS_FUENTE) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(ID_FUENTE_UNIDADES)) map.removeSource(ID_FUENTE_UNIDADES);
  claveFuentePorMapa.delete(map);
}

function asegurarFuenteUnidades(map: MapLibreMap): void {
  const clave = claveFuenteAgrupamiento();
  if (map.getSource(ID_FUENTE_UNIDADES) && claveFuentePorMapa.get(map) === clave) return;
  if (map.getSource(ID_FUENTE_UNIDADES)) quitarCapasYFuenteUnidades(map);
  map.addSource(ID_FUENTE_UNIDADES, specFuenteUnidades());
  claveFuentePorMapa.set(map, clave);
}

function montarCapasCluster(map: MapLibreMap): void {
  if (!leerPrefsAgrupamiento().clustering) return;
  if (!map.getLayer(ID_CAPA_CLUSTERS)) {
    map.addLayer({
      id: ID_CAPA_CLUSTERS,
      type: "circle",
      source: ID_FUENTE_UNIDADES,
      filter: FILTRO_CLUSTER,
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#14b8a6",
          8,
          "#0d9488",
          20,
          "#0f766e",
        ],
        "circle-radius": ["step", ["get", "point_count"], 16, 8, 20, 20, 26],
        "circle-opacity": 0.92,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#042f2e",
      },
    });
  }
  if (!map.getLayer(ID_CAPA_CLUSTER_COUNT)) {
    map.addLayer({
      id: ID_CAPA_CLUSTER_COUNT,
      type: "symbol",
      source: ID_FUENTE_UNIDADES,
      filter: FILTRO_CLUSTER,
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["Open Sans Regular"],
        "text-size": 12,
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#f0fdfa",
        "text-halo-color": "#042f2e",
        "text-halo-width": 1.4,
      },
    });
  }
}

function syncLayoutUnidades(map: MapLibreMap): void {
  const prefs = leerPrefsUnidades();
  const visLabels = prefs.labels ? "visible" : "none";

  if (map.getLayer(ID_CAPA_UNIDADES_HIT)) {
    map.setFilter(ID_CAPA_UNIDADES_HIT, FILTRO_HOJA);
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
    map.setFilter(ID_CAPA_UNIDADES_LABEL, FILTRO_LABEL);
    map.setLayoutProperty(ID_CAPA_UNIDADES_LABEL, "visibility", visLabels);
    map.setLayoutProperty(ID_CAPA_UNIDADES_LABEL, "text-size", TAM_LABEL);
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL, "text-color", "#f0fdfa");
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL, "text-opacity", 0.92);
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL, "text-halo-color", "#020617");
    map.setPaintProperty(ID_CAPA_UNIDADES_LABEL, "text-halo-width", 1.6);
    map.setLayerZoomRange(ID_CAPA_UNIDADES_LABEL, 14, 24);
  }
  if (map.getLayer(ID_CAPA_UNIDADES_LABEL_SEL)) {
    map.setFilter(ID_CAPA_UNIDADES_LABEL_SEL, FILTRO_LABEL_SEL);
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

function idsHojasVisibles(map: MapLibreMap): Set<string> | null {
  if (!map.getSource(ID_FUENTE_UNIDADES)) return null;
  const feats = map.querySourceFeatures(ID_FUENTE_UNIDADES);
  if (feats.length === 0) return null;
  const ids = new Set<string>();
  for (const f of feats) {
    if (f.properties && "point_count" in f.properties) continue;
    const id = f.properties?.id;
    if (id != null) ids.add(String(id));
  }
  return ids;
}

/** Autos 3D solo si no están dentro de un cluster (o clustering off). */
export function sincronizarUnidadesVisibles3d(
  map: MapLibreMap,
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): void {
  if (!leerPrefsAgrupamiento().clustering) {
    setDataUnidades3d(map, unidades, selectedId);
    return;
  }
  const ids = idsHojasVisibles(map);
  if (!ids) return;
  setDataUnidades3d(
    map,
    unidades.filter((u) => ids.has(u.id)),
    selectedId,
  );
}

function publicarUnidades(
  map: MapLibreMap,
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): void {
  const source = map.getSource(ID_FUENTE_UNIDADES) as GeoJSONSource | undefined;
  source?.setData(geojsonUnidades(unidades, selectedId));
  sincronizarUnidadesVisibles3d(map, unidades, selectedId);
}

/** Aplica prefs (labels, cluster, mesh) y refresca unidades 3D. */
export function aplicarPrefsUnidades(
  map: MapLibreMap,
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): void {
  if (!map.getStyle()) return;
  if (!asegurarCapaUnidades(map)) return;
  syncLayoutUnidades(map);
  publicarUnidades(map, unidades, selectedId);
  map.triggerRepaint();
}

function capasClicUnidad(map: MapLibreMap): string[] {
  return [ID_CAPA_UNIDADES_HIT].filter((id) => map.getLayer(id));
}

function capasClicCluster(map: MapLibreMap): string[] {
  return [ID_CAPA_CLUSTERS].filter((id) => map.getLayer(id));
}

function capasClicPuntero(map: MapLibreMap): string[] {
  return [...capasClicCluster(map), ...capasClicUnidad(map)];
}

async function expandirCluster(map: MapLibreMap, e: MapMouseEvent): Promise<boolean> {
  const layers = capasClicCluster(map);
  if (!layers.length) return false;
  const hits = map.queryRenderedFeatures(e.point, { layers });
  const feat = hits[0];
  if (!feat || feat.properties?.cluster_id == null) return false;
  const source = map.getSource(ID_FUENTE_UNIDADES) as GeoJSONSource | undefined;
  if (!source || typeof source.getClusterExpansionZoom !== "function") return false;
  const geom = feat.geometry as Point | undefined;
  if (!geom || geom.type !== "Point") return false;
  try {
    const zoom = await source.getClusterExpansionZoom(feat.properties.cluster_id as number);
    map.easeTo({
      center: [geom.coordinates[0], geom.coordinates[1]],
      zoom,
      duration: 500,
      essential: true,
    });
  } catch {
    return false;
  }
  return true;
}

export function asegurarCapaUnidades(map: MapLibreMap): boolean {
  quitarCapasSpriteLegacy(map);
  asegurarFuenteUnidades(map);

  if (!map.getLayer(ID_CAPA_UNIDADES_HIT)) {
    map.addLayer({
      id: ID_CAPA_UNIDADES_HIT,
      type: "circle",
      source: ID_FUENTE_UNIDADES,
      filter: FILTRO_HOJA,
      paint: {
        "circle-radius": 18,
        "circle-opacity": 0,
        "circle-stroke-width": 0,
      },
    });
  }

  montarCapasCluster(map);

  try {
    if (!map.getLayer(ID_CAPA_UNIDADES_LABEL)) {
      map.addLayer({
        id: ID_CAPA_UNIDADES_LABEL,
        type: "symbol",
        source: ID_FUENTE_UNIDADES,
        minzoom: 14,
        filter: FILTRO_LABEL,
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
        filter: FILTRO_LABEL_SEL,
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
  publicarUnidades(map, unidades, selectedId);
}

export function montarCapaUnidades(
  map: MapLibreMap,
  unidades: UnidadEnMapa[],
  selectedId: string | null,
): void {
  if (!map.getStyle()) return;
  asegurarFuenteUnidades(map);
  if (!map.getLayer(ID_CAPA_UNIDADES_HIT)) {
    map.addLayer({
      id: ID_CAPA_UNIDADES_HIT,
      type: "circle",
      source: ID_FUENTE_UNIDADES,
      filter: FILTRO_HOJA,
      paint: {
        "circle-radius": 18,
        "circle-opacity": 0,
        "circle-stroke-width": 0,
      },
    });
  }
  const source = map.getSource(ID_FUENTE_UNIDADES) as GeoJSONSource | undefined;
  source?.setData(geojsonUnidades(unidades, selectedId));
  // Con clustering: mesh vacío hasta sourcedata (evita flash de todos los autos).
  montarCapaUnidades3d(
    map,
    leerPrefsAgrupamiento().clustering ? [] : unidades,
    selectedId,
  );
  asegurarCapaUnidades(map);
  sincronizarUnidadesVisibles3d(map, unidades, selectedId);
  if (map.getLayer(ID_CAPA_UNIDADES_3D) && map.getLayer(ID_CAPA_UNIDADES_LABEL)) {
    map.moveLayer(ID_CAPA_UNIDADES_3D, ID_CAPA_UNIDADES_LABEL);
  }
  if (map.getLayer(ID_CAPA_CLUSTERS) && map.getLayer(ID_CAPA_UNIDADES_LABEL)) {
    map.moveLayer(ID_CAPA_CLUSTERS, ID_CAPA_UNIDADES_LABEL);
  }
  if (map.getLayer(ID_CAPA_CLUSTER_COUNT) && map.getLayer(ID_CAPA_UNIDADES_LABEL)) {
    map.moveLayer(ID_CAPA_CLUSTER_COUNT, ID_CAPA_UNIDADES_LABEL);
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
    void expandirCluster(map, e).then((expandio) => {
      if (expandio) return;
      const layers = capasClicUnidad(map);
      const hits = layers.length ? map.queryRenderedFeatures(e.point, { layers }) : [];
      const id = (hits[0]?.properties?.id as string | undefined) ?? null;
      if (id === opts.getSelectedId()) return;
      opts.setSelectedId(id);
      setDataUnidades(map, opts.getUnidades(), id);
    });
  };

  let moveRaf = 0;
  let movePoint: MapMouseEvent["point"] | null = null;
  const onMove = (e: MapMouseEvent) => {
    movePoint = e.point;
    if (moveRaf) return;
    moveRaf = requestAnimationFrame(() => {
      moveRaf = 0;
      const layers = capasClicPuntero(map);
      if (!layers.length || !movePoint) return;
      const hits = map.queryRenderedFeatures(movePoint, { layers });
      map.getCanvas().style.cursor = hits.length ? "pointer" : "";
    });
  };

  let syncRaf = 0;
  const programarSync3d = () => {
    if (syncRaf) return;
    syncRaf = requestAnimationFrame(() => {
      syncRaf = 0;
      sincronizarUnidadesVisibles3d(map, opts.getUnidades(), opts.getSelectedId());
    });
  };

  const onSourceData = (e: MapSourceDataEvent) => {
    if (e.sourceId !== ID_FUENTE_UNIDADES || !e.isSourceLoaded) return;
    programarSync3d();
  };

  map.on("click", onClick);
  map.on("mousemove", onMove);
  map.on("sourcedata", onSourceData);
  map.on("zoomend", programarSync3d);
  map.on("moveend", programarSync3d);
  return () => {
    map.off("click", onClick);
    map.off("mousemove", onMove);
    map.off("sourcedata", onSourceData);
    map.off("zoomend", programarSync3d);
    map.off("moveend", programarSync3d);
    if (moveRaf) cancelAnimationFrame(moveRaf);
    if (syncRaf) cancelAnimationFrame(syncRaf);
    map.getCanvas().style.cursor = "";
  };
}
