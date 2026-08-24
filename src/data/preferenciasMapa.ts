import { CARACAS_CENTRO, CARACAS_ZOOM } from "@/data/geo";
import type { BaseMapa } from "@/map/estiloMapa";
import { CLAVES_BASE_MAPA } from "@/map/estiloMapa";

const CLAVE_VISTA = "centinela-ops-vista-mapa";
const CLAVE_BASE = "centinela-ops-base-mapa";
const CLAVE_MODO_3D = "centinela-ops-modo-3d";
const CLAVE_MODO_GLOBO = "centinela-ops-modo-globo";
const CLAVE_LOCALES_OSM = "centinela-ops-overlay-locales";

export interface VistaMapa {
  center: [number, number];
  zoom: number;
}

export const VISTA_DEFECTO: VistaMapa = {
  center: CARACAS_CENTRO,
  zoom: CARACAS_ZOOM,
};

function esCoordenada(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number" &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1])
  );
}

export function cargarVistaMapa(): VistaMapa | null {
  try {
    const raw = localStorage.getItem(CLAVE_VISTA);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<VistaMapa>;
    if (!esCoordenada(data.center) || typeof data.zoom !== "number" || !Number.isFinite(data.zoom)) {
      return null;
    }
    return { center: data.center, zoom: Math.min(19, Math.max(0, data.zoom)) };
  } catch {
    return null;
  }
}

export function guardarVistaMapa(vista: VistaMapa): void {
  try {
    localStorage.setItem(CLAVE_VISTA, JSON.stringify(vista));
  } catch {
    /* ignore */
  }
}

export function cargarBaseMapa(): BaseMapa | null {
  try {
    const v = localStorage.getItem(CLAVE_BASE);
    if (!v || !CLAVES_BASE_MAPA.has(v as BaseMapa)) return null;
    return v as BaseMapa;
  } catch {
    return null;
  }
}

export function guardarBaseMapa(base: BaseMapa): void {
  try {
    localStorage.setItem(CLAVE_BASE, base);
  } catch {
    /* ignore */
  }
}

export function cargarModo3d(): boolean | null {
  try {
    const v = localStorage.getItem(CLAVE_MODO_3D);
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function guardarModo3d(activo: boolean): void {
  try {
    localStorage.setItem(CLAVE_MODO_3D, activo ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function cargarModoGlobo(): boolean | null {
  try {
    const v = localStorage.getItem(CLAVE_MODO_GLOBO);
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function guardarModoGlobo(activo: boolean): void {
  try {
    localStorage.setItem(CLAVE_MODO_GLOBO, activo ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function cargarOverlayLocales(): boolean | null {
  try {
    const v = localStorage.getItem(CLAVE_LOCALES_OSM);
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function guardarOverlayLocales(activo: boolean): void {
  try {
    localStorage.setItem(CLAVE_LOCALES_OSM, activo ? "1" : "0");
  } catch {
    /* ignore */
  }
}
