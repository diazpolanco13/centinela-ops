import type { FeatureCollection, Point } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { LugarEncontrado } from "@/data/buscarLugares";
import { ID_CAPA_UNIDADES_HIT } from "@/map/capaUnidades";

export const ID_FUENTE_BUSQUEDA_LUGAR = "busqueda-lugar";
export const ID_CAPA_BUSQUEDA_HALO = "busqueda-lugar-halo";
export const ID_CAPA_BUSQUEDA_DOT = "busqueda-lugar-dot";
export const ID_CAPA_BUSQUEDA_LABEL = "busqueda-lugar-label";

const VACIO: FeatureCollection<Point> = { type: "FeatureCollection", features: [] };

function geojsonPin(lugar: LugarEncontrado | null): FeatureCollection<Point> {
  if (!lugar) return VACIO;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: lugar.lngLat },
        properties: { nombre: lugar.nombre },
      },
    ],
  };
}

function beforeUnidades(map: MapLibreMap): string | undefined {
  return map.getLayer(ID_CAPA_UNIDADES_HIT) ? ID_CAPA_UNIDADES_HIT : undefined;
}

function asegurarFuenteYCapas(map: MapLibreMap): void {
  if (!map.getSource(ID_FUENTE_BUSQUEDA_LUGAR)) {
    map.addSource(ID_FUENTE_BUSQUEDA_LUGAR, { type: "geojson", data: VACIO });
  }
  const before = beforeUnidades(map);
  if (!map.getLayer(ID_CAPA_BUSQUEDA_HALO)) {
    map.addLayer(
      {
        id: ID_CAPA_BUSQUEDA_HALO,
        type: "circle",
        source: ID_FUENTE_BUSQUEDA_LUGAR,
        paint: {
          "circle-radius": 14,
          "circle-color": "#38bdf8",
          "circle-opacity": 0.22,
        },
      },
      before,
    );
  }
  if (!map.getLayer(ID_CAPA_BUSQUEDA_DOT)) {
    map.addLayer(
      {
        id: ID_CAPA_BUSQUEDA_DOT,
        type: "circle",
        source: ID_FUENTE_BUSQUEDA_LUGAR,
        paint: {
          "circle-radius": 6,
          "circle-color": "#38bdf8",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#0b1220",
        },
      },
      before,
    );
  }
  if (!map.getLayer(ID_CAPA_BUSQUEDA_LABEL)) {
    map.addLayer(
      {
        id: ID_CAPA_BUSQUEDA_LABEL,
        type: "symbol",
        source: ID_FUENTE_BUSQUEDA_LUGAR,
        layout: {
          "text-field": ["get", "nombre"],
          "text-font": ["Open Sans Regular"],
          "text-size": 12,
          "text-anchor": "bottom",
          "text-offset": [0, -0.9],
          "text-max-width": 10,
          "text-optional": true,
        },
        paint: {
          "text-color": "#f8fafc",
          "text-halo-color": "#0b1220",
          "text-halo-width": 1.4,
        },
      },
      before,
    );
  }
}

export function mostrarPinBusqueda(map: MapLibreMap, lugar: LugarEncontrado): void {
  try {
    asegurarFuenteYCapas(map);
    const src = map.getSource(ID_FUENTE_BUSQUEDA_LUGAR) as GeoJSONSource | undefined;
    src?.setData(geojsonPin(lugar));
  } catch (err) {
    console.warn("busqueda: pin no se pudo pintar", err);
  }
}

export function restaurarPinBusqueda(
  map: MapLibreMap,
  lugar: LugarEncontrado | null,
): void {
  if (!lugar) return;
  mostrarPinBusqueda(map, lugar);
}

export function quitarPinBusqueda(map: MapLibreMap): void {
  const src = map.getSource(ID_FUENTE_BUSQUEDA_LUGAR) as GeoJSONSource | undefined;
  src?.setData(VACIO);
}
