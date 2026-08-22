import type { Map as MapLibreMap } from "maplibre-gl";
import type { EstadoUnidad } from "@/data/unidadesMock";

/** Sprite denso. MapLibre muestra CSS_PX a icon-size 1. */
const CSS_PX = 80;
const PIXEL_RATIO = 4;

/** Top view car, Stone / Noun Project. Crédito en README; no va en el sprite. */
const URL_ICONO_NOUN = "/noun-top-view-car-5105418.svg";

export const ESTADOS_ICONO: EstadoUnidad[] = [
  "en_zona",
  "en_ruta",
  "detenida",
  "sin_senal",
];

type PaletaAuto = {
  metal: string;
  vidrio: string;
};

const PALETA: Record<EstadoUnidad, PaletaAuto> = {
  en_ruta: { metal: "#f4f4f5", vidrio: "#0f172a" },
  en_zona: { metal: "#ecfdf5", vidrio: "#042f2e" },
  detenida: { metal: "#f3e7d3", vidrio: "#1c1917" },
  sin_senal: { metal: "#94a3b8", vidrio: "#1e293b" },
};

export function idIconoPuck(estado: EstadoUnidad): string {
  return `unidad-carro-${estado}`;
}

export function idIconoApple(estado: EstadoUnidad): string {
  return idIconoPuck(estado);
}

let plantillaNoun: string | null = null;

async function cargarPlantillaNoun(): Promise<string> {
  if (plantillaNoun) return plantillaNoun;
  const res = await fetch(URL_ICONO_NOUN);
  if (!res.ok) throw new Error(`icono auto ${res.status}`);
  plantillaNoun = await res.text();
  return plantillaNoun;
}

function dDelPath(svg: string): string {
  const m = svg.match(/\sd="([^"]+)"/);
  if (!m?.[1]) throw new Error("icono auto: sin path");
  return m[1];
}

function svgAuto(plantilla: string, estado: EstadoUnidad): string {
  const p = PALETA[estado];
  const d = dDelPath(plantilla.replace(/<text[\s\S]*?<\/text>/g, ""));
  const halo = `d="${d}" fill="none" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-linecap="round"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -6 116 116" width="116" height="116">
  <ellipse cx="50" cy="92" rx="18" ry="5" fill="#000" opacity="0.35"/>
  <path ${halo} stroke="#020617" stroke-width="7"/>
  <path ${halo} stroke="#f8fafc" stroke-width="3.4"/>
  <path fill="${p.vidrio}" d="${d}"/>
  <path fill="${p.metal}" fill-rule="evenodd" clip-rule="evenodd" d="${d}"/>
</svg>`;
}

async function rasterSvg(svg: string): Promise<ImageData> {
  const w = Math.round(CSS_PX * PIXEL_RATIO);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = w;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("canvas 2d");
    ctx.clearRect(0, 0, w, w);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, w);
    return ctx.getImageData(0, 0, w, w);
  } finally {
    URL.revokeObjectURL(url);
  }
}

type CacheIcono = { data: ImageData; pixelRatio: number };

let cache: Map<string, CacheIcono> | null = null;
let preparing: Promise<void> | null = null;

async function construirCache(): Promise<Map<string, CacheIcono>> {
  const plantilla = await cargarPlantillaNoun();
  const next = new Map<string, CacheIcono>();
  for (const estado of ESTADOS_ICONO) {
    next.set(idIconoPuck(estado), {
      data: await rasterSvg(svgAuto(plantilla, estado)),
      pixelRatio: PIXEL_RATIO,
    });
  }
  return next;
}

export function prepararIconosUnidad(): Promise<void> {
  if (cache) return Promise.resolve();
  preparing ??= construirCache().then((built) => {
    cache = built;
  });
  return preparing;
}

export function asegurarIconosUnidad(map: MapLibreMap): boolean {
  if (!cache) return false;
  for (const [id, img] of cache) {
    if (map.hasImage(id)) continue;
    map.addImage(id, img.data, { pixelRatio: img.pixelRatio, sdf: false });
  }
  return true;
}

export function reemplazarIconosUnidad(map: MapLibreMap): boolean {
  if (!cache) return false;
  for (const [id, img] of cache) {
    if (map.hasImage(id)) map.removeImage(id);
    map.addImage(id, img.data, { pixelRatio: img.pixelRatio, sdf: false });
  }
  return true;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cache = null;
    preparing = null;
    plantillaNoun = null;
  });
}
