import type { Map as MapLibreMap } from "maplibre-gl";
import type { EstadoUnidad } from "@/data/unidadesMock";

/** Sprite denso. MapLibre muestra CSS_PX a icon-size 1. */
const CSS_PX = 80;
const PIXEL_RATIO = 4;

export const ESTADOS_ICONO: EstadoUnidad[] = [
  "en_zona",
  "en_ruta",
  "detenida",
  "sin_senal",
];

type PaletaAuto = {
  metal: string;
  metalLado: string;
  metalTecho: string;
  metalBrillo: string;
  vidrio: string;
  vidrioCielo: string;
  faro: string;
  faroNuc: string;
  stop: string;
  goma: string;
  acento: string;
};

const PALETA: Record<EstadoUnidad, PaletaAuto> = {
  en_ruta: {
    metal: "#f1f2f4",
    metalLado: "#9aa0a8",
    metalTecho: "#e8eaee",
    metalBrillo: "#ffffff",
    vidrio: "#0b1220",
    vidrioCielo: "#64748b",
    faro: "#e0f2fe",
    faroNuc: "#f8fafc",
    stop: "#e11d48",
    goma: "#0a0a0b",
    acento: "#2dd4bf",
  },
  en_zona: {
    metal: "#ecfdf5",
    metalLado: "#5eead4",
    metalTecho: "#d1fae5",
    metalBrillo: "#ffffff",
    vidrio: "#042f2e",
    vidrioCielo: "#0f766e",
    faro: "#ccfbf1",
    faroNuc: "#f0fdfa",
    stop: "#e11d48",
    goma: "#0a0a0b",
    acento: "#14b8a6",
  },
  detenida: {
    metal: "#f3e7d3",
    metalLado: "#b45309",
    metalTecho: "#ead9c0",
    metalBrillo: "#fffbeb",
    vidrio: "#1c1917",
    vidrioCielo: "#78716c",
    faro: "#ffedd5",
    faroNuc: "#fff7ed",
    stop: "#ea580c",
    goma: "#0a0a0b",
    acento: "#d97706",
  },
  sin_senal: {
    metal: "#94a3b8",
    metalLado: "#475569",
    metalTecho: "#7b8fa3",
    metalBrillo: "#cbd5e1",
    vidrio: "#1e293b",
    vidrioCielo: "#475569",
    faro: "#94a3b8",
    faroNuc: "#cbd5e1",
    stop: "#7f1d1d",
    goma: "#0a0a0b",
    acento: "#64748b",
  },
};

export function idIconoPuck(estado: EstadoUnidad): string {
  return `unidad-carro-${estado}`;
}

export function idIconoApple(estado: EstadoUnidad): string {
  return idIconoPuck(estado);
}

/** Silueta de la 1ª versión pulida (viewBox 128). Tamaño MapLibre no se toca. */
function svgAuto(estado: EstadoUnidad): string {
  const p = PALETA[estado];
  const id = estado.replaceAll("_", "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="m${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${p.metalLado}"/>
      <stop offset="22%" stop-color="${p.metalBrillo}"/>
      <stop offset="50%" stop-color="${p.metal}"/>
      <stop offset="78%" stop-color="${p.metalBrillo}"/>
      <stop offset="100%" stop-color="${p.metalLado}"/>
    </linearGradient>
    <linearGradient id="v${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.vidrioCielo}"/>
      <stop offset="55%" stop-color="${p.vidrio}"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <ellipse cx="64" cy="112" rx="22" ry="6.5" fill="#000" opacity="0.26"/>
  <rect x="40.5" y="34" width="6.5" height="15" rx="2.1" fill="${p.goma}"/>
  <rect x="81" y="34" width="6.5" height="15" rx="2.1" fill="${p.goma}"/>
  <rect x="40.5" y="78" width="6.5" height="15" rx="2.1" fill="${p.goma}"/>
  <rect x="81" y="78" width="6.5" height="15" rx="2.1" fill="${p.goma}"/>
  <path fill="url(#m${id})" stroke="rgba(0,0,0,0.28)" stroke-width="0.7" stroke-linejoin="round"
    d="M53 18
       C58 14 70 14 75 18
       C86 24 91 36 91 50
       L91 90
       C91 102 85 111 76 114.5
       C71 116.5 57 116.5 52 114.5
       C43 111 37 102 37 90
       L37 50
       C37 36 42 24 53 18 Z"/>
  <ellipse cx="34.5" cy="42" rx="4.2" ry="2.6" fill="${p.metal}"/>
  <ellipse cx="93.5" cy="42" rx="4.2" ry="2.6" fill="${p.metal}"/>
  <path fill="url(#v${id})"
    d="M49 40 C54 33 74 33 79 40 L77 54 C73 49 55 49 51 54 Z"/>
  <rect x="50" y="54" width="28" height="26" rx="4.5" fill="${p.vidrio}" opacity="0.92"/>
  <rect x="52" y="56" width="24" height="8" rx="2" fill="${p.vidrioCielo}" opacity="0.35"/>
  <path fill="url(#v${id})"
    d="M50 84 C55 80 73 80 78 84 L76 100 C71 97 57 97 52 100 Z"/>
  <rect x="49" y="22.5" width="9" height="3.2" rx="1.2" fill="${p.faro}"/>
  <rect x="70" y="22.5" width="9" height="3.2" rx="1.2" fill="${p.faro}"/>
  <rect x="47" y="107.5" width="13" height="3.6" rx="1.3" fill="${p.stop}"/>
  <rect x="68" y="107.5" width="13" height="3.6" rx="1.3" fill="${p.stop}"/>
  <path d="M58 18.5 C64 16.5 70 18.5 70 18.5" fill="none" stroke="${p.metalBrillo}" stroke-width="1.1" stroke-linecap="round" opacity="0.7"/>
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
  const next = new Map<string, CacheIcono>();
  for (const estado of ESTADOS_ICONO) {
    next.set(idIconoPuck(estado), {
      data: await rasterSvg(svgAuto(estado)),
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
  });
}
