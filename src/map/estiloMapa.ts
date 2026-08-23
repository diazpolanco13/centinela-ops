import type {
  ExpressionSpecification,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";

// Bases de mapa disponibles. Las de MapTiler ("*-hd", outdoor) requieren
// VITE_MAPTILER_KEY (clave gratuita) y solo aparecen si está configurada.
export type BaseMapa =
  | "dark-matter"
  | "calles-claro"
  | "positron"
  | "osm"
  | "hibrido"
  | "satelite-hd"
  | "calles-hd"
  | "outdoor";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
export const MAPTILER_DISPONIBLE = Boolean(MAPTILER_KEY);

/** Estilo vectorial Carto Dark Matter (GL). */
export const ESTILO_DARK_MATTER_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** Tiles vectoriales OpenFreeMap (OpenMapTiles) para extrusión 3D. */
export const FUENTE_OPENFREEMAP_URL = "https://tiles.openfreemap.org/planet";
export const ID_FUENTE_EDIFICIOS_3D = "openfreemap";
export const ID_CAPA_EDIFICIOS_3D = "edificios-3d";

/** Capas planas de edificios del estilo Carto (se ocultan al activar 3D). */
const CAPAS_EDIFICIO_PLANAS_CARTO = ["building", "building-top"] as const;

/** Helper: subdominios CARTO (MapLibre no soporta {s}). */
function tilesCarto(path: string): string[] {
  return ["a", "b", "c", "d"].map(
    (s) => `https://${s}.basemaps.cartocdn.com/${path}/{z}/{x}/{y}.png`,
  );
}

/** Opciones que se muestran en la UI (MapTiler solo si hay clave). */
export const BASES_DISPONIBLES: { valor: BaseMapa; label: string }[] = [
  { valor: "dark-matter", label: "🌑 Carto Dark Matter" },
  { valor: "calles-claro", label: "🗺️ Calles claro" },
  { valor: "positron", label: "◻️ Positron" },
  { valor: "osm", label: "🌍 OpenStreetMap" },
  { valor: "hibrido", label: "🛰️ Híbrido" },
  ...(MAPTILER_DISPONIBLE
    ? ([
        { valor: "satelite-hd", label: "🛰️ Satélite HD" },
        { valor: "calles-hd", label: "🗺️ Calles HD" },
        { valor: "outdoor", label: "🏕️ Outdoor" },
      ] as { valor: BaseMapa; label: string }[])
    : []),
];

/** Capas base (raster) que se activan/desactivan según la base seleccionada. */
export const CAPAS_BASE = [
  "base-carto-voyager",
  "base-carto-positron",
  "base-osm",
  "base-esri-img",
  "base-esri-transp",
  "base-esri-ref",
  "base-mt-sat",
  "base-mt-calles",
  "base-mt-outdoor",
] as const;

/** Qué capas base deben estar visibles para cada modo. */
export const VISIBILIDAD_BASE: Record<BaseMapa, string[]> = {
  "dark-matter": [],
  "calles-claro": ["base-carto-voyager"],
  positron: ["base-carto-positron"],
  osm: ["base-osm"],
  hibrido: ["base-esri-img", "base-esri-transp", "base-esri-ref"],
  "satelite-hd": ["base-mt-sat", "base-esri-transp", "base-esri-ref"],
  "calles-hd": ["base-mt-calles"],
  outdoor: ["base-mt-outdoor"],
};

/** True si la base carga un style.json externo (no el estilo raster compuesto). */
export function esBaseEstiloExterno(base: BaseMapa): boolean {
  return base === "dark-matter";
}

/** Estilo inicial / al cambiar de base: URL externa o especificación raster. */
export function estiloMapaParaBase(base: BaseMapa): string | StyleSpecification {
  if (base === "dark-matter") return ESTILO_DARK_MATTER_URL;
  return construirEstilo(base);
}

/**
 * Rango de zoom del fade-in de los edificios 3D (ver `fill-extrusion-opacity`
 * abajo): invisibles hasta este punto, opacidad plena al llegar al segundo.
 * Las etiquetas de nombre de los marcadores (`escalaVista.ts`) usan el mismo
 * rango para aparecer "en la misma proporción" — una sola fuente de verdad.
 */
export const ZOOM_INICIO_FADE_EDIFICIOS_3D = 14;
export const ZOOM_FIN_FADE_EDIFICIOS_3D = 14.5;

/** Mismo rango que `fill-extrusion-height` (crecen con el zoom). */
const ZOOM_ALTURA_CERO = 14;
const ZOOM_ALTURA_PLENA = 15;

/** Toggle 2D↔3D: crecen con el pitch (800 ms) y bajan con el flatten (600 ms). */
const DURACION_CRECER_EDIFICIOS_MS = 800;
const DURACION_BAJAR_EDIFICIOS_MS = 600;

/** `building-top` de Carto Dark Matter (`rgba(57, 57, 57, 1)`). */
const COLOR_EDIFICIO_2D = "#393939";
const OPACIDAD_3D_PLENA = 0.85;

const STOPS_COLOR_3D: ReadonlyArray<readonly [number, string]> = [
  [0, "#334155"],
  [15, "#0d9488"],
  [50, "#2563eb"],
  [120, "#7c3aed"],
  [200, "#db2777"],
];

const EXPR_ALTURA_PLENA: ExpressionSpecification = [
  "coalesce",
  ["get", "render_height"],
  5,
];
const EXPR_BASE_PLENA: ExpressionSpecification = [
  "coalesce",
  ["get", "render_min_height"],
  0,
];
const EXPR_ALTURA_ZOOM: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  ZOOM_ALTURA_CERO,
  0,
  ZOOM_ALTURA_PLENA,
  EXPR_ALTURA_PLENA,
];
const EXPR_BASE_ZOOM: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  ZOOM_ALTURA_CERO,
  0,
  ZOOM_ALTURA_PLENA,
  EXPR_BASE_PLENA,
];

const EXPR_COLOR_RAMP: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "render_height"], 0],
  ...STOPS_COLOR_3D.flat(),
];

const EXPR_OPACIDAD_ZOOM: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  ZOOM_INICIO_FADE_EDIFICIOS_3D,
  0,
  ZOOM_FIN_FADE_EDIFICIOS_3D,
  OPACIDAD_3D_PLENA,
];

let escalaEdificios = 1;
let genAnimEdificios = 0;
let rafAnimEdificios = 0;
const opacidadPlanaOriginal = new Map<string, unknown>();

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function factorZoomAltura(zoom: number): number {
  if (zoom <= ZOOM_ALTURA_CERO) return 0;
  if (zoom >= ZOOM_ALTURA_PLENA) return 1;
  return (zoom - ZOOM_ALTURA_CERO) / (ZOOM_ALTURA_PLENA - ZOOM_ALTURA_CERO);
}

function factorZoomOpacidad3d(zoom: number): number {
  if (zoom <= ZOOM_INICIO_FADE_EDIFICIOS_3D) return 0;
  if (zoom >= ZOOM_FIN_FADE_EDIFICIOS_3D) return OPACIDAD_3D_PLENA;
  return (
    OPACIDAD_3D_PLENA *
    ((zoom - ZOOM_INICIO_FADE_EDIFICIOS_3D) /
      (ZOOM_FIN_FADE_EDIFICIOS_3D - ZOOM_INICIO_FADE_EDIFICIOS_3D))
  );
}

/** Carto `building-top`: opacity 0 @ z13 → 1 @ z16. */
function factorZoomOpacidadPlana(zoom: number): number {
  if (zoom <= 13) return 0;
  if (zoom >= 16) return 1;
  return (zoom - 13) / 3;
}

function hexARgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpHex(desde: string, hasta: string, t: number): string {
  const [ar, ag, ab] = hexARgb(desde);
  const [br, bg, bb] = hexARgb(hasta);
  const toHex = (c: number) => Math.round(c).toString(16).padStart(2, "0");
  return `#${toHex(ar + (br - ar) * t)}${toHex(ag + (bg - ag) * t)}${toHex(ab + (bb - ab) * t)}`;
}

/** Gris pleno al 25% de altura: el swap final ya no cambia de color. */
function graynessDeEscala(escala: number): number {
  return Math.min(1, (1 - escala) / 0.75);
}

function exprColorMezcla(grayness: number): ExpressionSpecification | string {
  if (grayness <= 0) return EXPR_COLOR_RAMP;
  if (grayness >= 1) return COLOR_EDIFICIO_2D;
  const stops: Array<number | string> = [];
  for (const [altura, color] of STOPS_COLOR_3D) {
    stops.push(altura, lerpHex(color, COLOR_EDIFICIO_2D, grayness));
  }
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "render_height"], 0],
    ...stops,
  ] as ExpressionSpecification;
}

function recordarOpacidadPlana(map: MapLibreMap): void {
  for (const id of CAPAS_EDIFICIO_PLANAS_CARTO) {
    if (!map.getLayer(id) || opacidadPlanaOriginal.has(id)) continue;
    opacidadPlanaOriginal.set(id, map.getPaintProperty(id, "fill-opacity") ?? 1);
  }
}

function restaurarOpacidadPlana(map: MapLibreMap): void {
  for (const id of CAPAS_EDIFICIO_PLANAS_CARTO) {
    if (!map.getLayer(id) || !opacidadPlanaOriginal.has(id)) continue;
    map.setPaintProperty(id, "fill-opacity", opacidadPlanaOriginal.get(id));
  }
}

function aplicarFadePlanas(map: MapLibreMap, fade: number): void {
  recordarOpacidadPlana(map);
  const visible = fade > 0.01;
  for (const id of CAPAS_EDIFICIO_PLANAS_CARTO) {
    if (!map.getLayer(id)) continue;
    map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    if (!visible) continue;
    map.setPaintProperty(
      id,
      "fill-opacity",
      factorZoomOpacidadPlana(map.getZoom()) * fade,
    );
  }
}

function ocultarPlanas(map: MapLibreMap): void {
  for (const id of CAPAS_EDIFICIO_PLANAS_CARTO) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", "none");
    }
  }
}

function capaEdificiosViva(map: MapLibreMap): boolean {
  try {
    return Boolean(map.getLayer(ID_CAPA_EDIFICIOS_3D));
  } catch {
    return false;
  }
}

export function cancelarAnimacionEdificios3d(): void {
  genAnimEdificios += 1;
  if (rafAnimEdificios) {
    cancelAnimationFrame(rafAnimEdificios);
    rafAnimEdificios = 0;
  }
}

/**
 * `zoom` no puede ir dentro de `*`: MapLibre solo lo admite como input de
 * interpolate/step de primer nivel. Con escala < 1 se multiplica la altura
 * plena por (escala × factor de zoom JS). Al llegar a 1 se restaura el
 * interpolate para que el scroll siga creciendo los edificios en GPU.
 */
function aplicarEscalaExtrusion(
  map: MapLibreMap,
  escala: number,
  shrinking = false,
): void {
  if (!capaEdificiosViva(map)) return;
  escalaEdificios = escala;
  const grayness = graynessDeEscala(escala);
  map.setPaintProperty(
    ID_CAPA_EDIFICIOS_3D,
    "fill-extrusion-color",
    exprColorMezcla(grayness),
  );

  if (escala >= 1) {
    map.setPaintProperty(ID_CAPA_EDIFICIOS_3D, "fill-extrusion-height", EXPR_ALTURA_ZOOM);
    map.setPaintProperty(ID_CAPA_EDIFICIOS_3D, "fill-extrusion-base", EXPR_BASE_ZOOM);
    map.setPaintProperty(ID_CAPA_EDIFICIOS_3D, "fill-extrusion-opacity", EXPR_OPACIDAD_ZOOM);
    ocultarPlanas(map);
    restaurarOpacidadPlana(map);
    return;
  }

  const k = escala * factorZoomAltura(map.getZoom());
  map.setPaintProperty(ID_CAPA_EDIFICIOS_3D, "fill-extrusion-height", [
    "*",
    EXPR_ALTURA_PLENA,
    k,
  ]);
  map.setPaintProperty(ID_CAPA_EDIFICIOS_3D, "fill-extrusion-base", [
    "*",
    EXPR_BASE_PLENA,
    k,
  ]);

  let fade3d = 1;
  if (shrinking && escala < 0.35) fade3d = escala / 0.35;
  map.setPaintProperty(
    ID_CAPA_EDIFICIOS_3D,
    "fill-extrusion-opacity",
    factorZoomOpacidad3d(map.getZoom()) * fade3d,
  );

  const fade2d = shrinking
    ? escala < 0.45
      ? 1 - escala / 0.45
      : 0
    : escala < 0.35
      ? 1 - escala / 0.35
      : 0;
  aplicarFadePlanas(map, fade2d);
}

function animarEscalaEdificios(
  map: MapLibreMap,
  desde: number,
  hasta: number,
  duracionMs: number,
  onDone?: () => void,
): void {
  cancelarAnimacionEdificios3d();
  const gen = genAnimEdificios;
  const t0 = performance.now();
  const shrinking = hasta < desde;
  const tick = (now: number) => {
    if (gen !== genAnimEdificios) return;
    if (!capaEdificiosViva(map)) {
      rafAnimEdificios = 0;
      return;
    }
    const t = Math.min(1, (now - t0) / duracionMs);
    aplicarEscalaExtrusion(
      map,
      desde + (hasta - desde) * easeOutCubic(t),
      shrinking,
    );
    if (t < 1) {
      rafAnimEdificios = requestAnimationFrame(tick);
      return;
    }
    rafAnimEdificios = 0;
    onDone?.();
  };
  rafAnimEdificios = requestAnimationFrame(tick);
}

function ocultarEdificios3d(map: MapLibreMap): void {
  if (capaEdificiosViva(map)) {
    map.setLayoutProperty(ID_CAPA_EDIFICIOS_3D, "visibility", "none");
  }
  restaurarOpacidadPlana(map);
  for (const id of CAPAS_EDIFICIO_PLANAS_CARTO) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", "visible");
    }
  }
}

/**
 * Fuente OpenFreeMap + capa fill-extrusion. Visible por defecto.
 * Idempotente. Colores pensados para contrastar sobre Dark Matter.
 */
export function asegurarEdificios3d(
  map: MapLibreMap,
  escalaInicial = 1,
  opts?: { ocultarPlanas?: boolean },
): void {
  if (opts?.ocultarPlanas !== false) {
    ocultarPlanas(map);
  }

  if (!map.getSource(ID_FUENTE_EDIFICIOS_3D)) {
    map.addSource(ID_FUENTE_EDIFICIOS_3D, {
      type: "vector",
      url: FUENTE_OPENFREEMAP_URL,
    });
  }

  if (map.getLayer(ID_CAPA_EDIFICIOS_3D)) {
    map.setLayoutProperty(ID_CAPA_EDIFICIOS_3D, "visibility", "visible");
    return;
  }

  const layers = map.getStyle().layers ?? [];
  let beforeId: string | undefined;
  for (const layer of layers) {
    const layout = layer.layout as Record<string, unknown> | undefined;
    if (layer.type === "symbol" && layout && "text-field" in layout) {
      beforeId = layer.id;
      break;
    }
  }

  // Nota: `zoom` solo vale como input de `interpolate`/`step` de primer nivel.
  // No usar `zoom` dentro de `case` (MapLibre lanza y la capa no se crea).
  map.addLayer(
    {
      id: ID_CAPA_EDIFICIOS_3D,
      source: ID_FUENTE_EDIFICIOS_3D,
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: ZOOM_INICIO_FADE_EDIFICIOS_3D,
      filter: ["!=", ["get", "hide_3d"], true],
      layout: { visibility: "visible" },
      paint: {
        // Ramp por altura con los mismos acentos que los pines de unidad SEBIN
        // (slate "sin unidad" → teal de marca → azul/violeta/magenta): las
        // estructuras bajas quedan en un tono neutro que se funde con el fondo,
        // y cada tramo de altura resalta en el acento que ya usan tarjetas/badges.
        "fill-extrusion-color":
          escalaInicial >= 1 ? EXPR_COLOR_RAMP : exprColorMezcla(1),
        "fill-extrusion-height":
          escalaInicial >= 1
            ? EXPR_ALTURA_ZOOM
            : (["*", EXPR_ALTURA_PLENA, 0] as ExpressionSpecification),
        "fill-extrusion-base":
          escalaInicial >= 1
            ? EXPR_BASE_ZOOM
            : (["*", EXPR_BASE_PLENA, 0] as ExpressionSpecification),
        // Fade-in con el zoom (igual que Osiris): opacidad 0 justo al cruzar
        // minzoom y sube a la opacidad plena a medio nivel de zoom, para que
        // los edificios se "materialicen" en vez de aparecer de golpe.
        "fill-extrusion-opacity": EXPR_OPACIDAD_ZOOM,
      },
    },
    beforeId,
  );
  escalaEdificios = escalaInicial;
}

/** Activa o desactiva extrusión 3D sobre Carto Dark Matter (idempotente). */
export function aplicarEdificios3d(
  map: MapLibreMap,
  activo: boolean,
  opts?: { animar?: boolean },
): void {
  const animar =
    Boolean(opts?.animar) && map.getZoom() >= ZOOM_INICIO_FADE_EDIFICIOS_3D;

  if (activo) {
    const existia = capaEdificiosViva(map);
    const estabaOculta =
      existia && map.getLayoutProperty(ID_CAPA_EDIFICIOS_3D, "visibility") === "none";
    const naceEnCero = animar && (!existia || estabaOculta);
    if (naceEnCero && existia) aplicarEscalaExtrusion(map, 0, false);
    asegurarEdificios3d(map, naceEnCero ? 0 : 1, { ocultarPlanas: !animar });
    if (animar) {
      animarEscalaEdificios(map, escalaEdificios, 1, DURACION_CRECER_EDIFICIOS_MS);
      return;
    }
    cancelarAnimacionEdificios3d();
    aplicarEscalaExtrusion(map, 1);
    return;
  }

  if (animar && capaEdificiosViva(map)) {
    animarEscalaEdificios(map, escalaEdificios, 0, DURACION_BAJAR_EDIFICIOS_MS, () => {
      ocultarEdificios3d(map);
    });
    return;
  }

  cancelarAnimacionEdificios3d();
  escalaEdificios = 0;
  ocultarEdificios3d(map);
}

/** Bases del selector rápido MAP / SAT (híbrido con calles). */
export const BASE_MAPA_CARTO: BaseMapa = "dark-matter";
export const BASE_MAPA_SATELITE: BaseMapa = "hibrido";

/** Base al primer ingreso (sin preferencia guardada en localStorage). */
export const BASE_MAPA_DEFECTO: BaseMapa = BASE_MAPA_CARTO;

export function construirEstilo(baseActiva: BaseMapa = "hibrido"): StyleSpecification {
  const visibles = new Set(VISIBILIDAD_BASE[baseActiva] ?? VISIBILIDAD_BASE.hibrido);
  const vis = (id: string): "visible" | "none" =>
    visibles.has(id) ? "visible" : "none";

  const sources: StyleSpecification["sources"] = {
    "carto-voyager": {
      type: "raster",
      tiles: tilesCarto("rastertiles/voyager"),
      tileSize: 256,
      maxzoom: 20,
      attribution: "© OpenStreetMap contributors, © CARTO",
    },
    "carto-positron": {
      type: "raster",
      tiles: tilesCarto("light_all"),
      tileSize: 256,
      maxzoom: 20,
      attribution: "© OpenStreetMap contributors, © CARTO",
    },
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
    "esri-img": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
    "esri-transp": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
    },
    "esri-ref": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  };

  const layers: StyleSpecification["layers"] = [
    {
      id: "base-carto-voyager",
      type: "raster",
      source: "carto-voyager",
      layout: { visibility: vis("base-carto-voyager") },
    },
    {
      id: "base-carto-positron",
      type: "raster",
      source: "carto-positron",
      layout: { visibility: vis("base-carto-positron") },
    },
    {
      id: "base-osm",
      type: "raster",
      source: "osm",
      layout: { visibility: vis("base-osm") },
    },
    {
      id: "base-esri-img",
      type: "raster",
      source: "esri-img",
      layout: { visibility: vis("base-esri-img") },
    },
  ];

  if (MAPTILER_DISPONIBLE) {
    sources["mt-sat"] = {
      type: "raster",
      tiles: [
        `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
      ],
      tileSize: 256,
      maxzoom: 20,
      attribution: "© MapTiler © OpenStreetMap contributors",
    };
    sources["mt-calles"] = {
      type: "raster",
      tiles: [
        `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
      ],
      tileSize: 256,
      maxzoom: 20,
      attribution: "© MapTiler © OpenStreetMap contributors",
    };
    sources["mt-outdoor"] = {
      type: "raster",
      tiles: [
        `https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
      ],
      tileSize: 256,
      maxzoom: 20,
      attribution: "© MapTiler © OpenStreetMap contributors",
    };
    layers.push(
      {
        id: "base-mt-sat",
        type: "raster",
        source: "mt-sat",
        layout: { visibility: vis("base-mt-sat") },
      },
      {
        id: "base-mt-calles",
        type: "raster",
        source: "mt-calles",
        layout: { visibility: vis("base-mt-calles") },
      },
      {
        id: "base-mt-outdoor",
        type: "raster",
        source: "mt-outdoor",
        layout: { visibility: vis("base-mt-outdoor") },
      },
    );
  }

  layers.push(
    {
      id: "base-esri-transp",
      type: "raster",
      source: "esri-transp",
      layout: { visibility: vis("base-esri-transp") },
    },
    {
      id: "base-esri-ref",
      type: "raster",
      source: "esri-ref",
      layout: { visibility: vis("base-esri-ref") },
    },
  );

  return {
    version: 8,
    sources,
    layers,
    // demotiles no tiene "Open Sans Regular" (404). Mismo stack que Carto Dark Matter.
    glyphs: "https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf",
  };
}

/** Conjunto de claves válidas según las bases disponibles en este build. */
export const CLAVES_BASE_MAPA = new Set(BASES_DISPONIBLES.map((b) => b.valor));
