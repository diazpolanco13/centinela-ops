import { useSyncExternalStore } from "react";
import { CARACAS_CENTRO, CARACAS_ZOOM } from "@/data/geo";
import type { BaseMapa } from "@/map/estiloMapa";
import { CLAVES_BASE_MAPA } from "@/map/estiloMapa";

const CLAVE_VISTA = "centinela-ops-vista-mapa";
const CLAVE_BASE = "centinela-ops-base-mapa";
const CLAVE_MODO_3D = "centinela-ops-modo-3d";
const CLAVE_MODO_GLOBO = "centinela-ops-modo-globo";
const CLAVE_AGRUPAMIENTO = "centinela-ops-agrupamiento-mapa";

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

export function restablecerPrefsVistaMapa(): void {
  try {
    localStorage.removeItem(CLAVE_BASE);
    localStorage.removeItem(CLAVE_MODO_3D);
    localStorage.removeItem(CLAVE_MODO_GLOBO);
  } catch {
    /* ignore */
  }
}

export type PrefsAgrupamiento = {
  clustering: boolean;
  /** Radio de agrupación en px de pantalla. */
  clusterRadius: number;
  /** Zoom máximo donde aún se agrupa. Más cerca = autos sueltos. */
  clusterMaxZoom: number;
};

export const PREFS_AGRUPAMIENTO_DEFECTO: PrefsAgrupamiento = {
  clustering: true,
  clusterRadius: 50,
  clusterMaxZoom: 14,
};

export const RANGO_AGRUPAMIENTO = {
  clusterRadius: { min: 30, max: 90 },
  clusterMaxZoom: { min: 10, max: 16 },
} as const;

const listenersAgrup = new Set<() => void>();
let estadoAgrup: PrefsAgrupamiento = cargarAgrupamiento();

function emitirAgrup(): void {
  for (const l of listenersAgrup) l();
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function normalizarAgrupamiento(raw: Partial<PrefsAgrupamiento> | null | undefined): PrefsAgrupamiento {
  const base = PREFS_AGRUPAMIENTO_DEFECTO;
  return {
    clustering: typeof raw?.clustering === "boolean" ? raw.clustering : base.clustering,
    clusterRadius: clamp(
      typeof raw?.clusterRadius === "number" ? raw.clusterRadius : base.clusterRadius,
      RANGO_AGRUPAMIENTO.clusterRadius.min,
      RANGO_AGRUPAMIENTO.clusterRadius.max,
    ),
    clusterMaxZoom: clamp(
      typeof raw?.clusterMaxZoom === "number" ? raw.clusterMaxZoom : base.clusterMaxZoom,
      RANGO_AGRUPAMIENTO.clusterMaxZoom.min,
      RANGO_AGRUPAMIENTO.clusterMaxZoom.max,
    ),
  };
}

function cargarAgrupamiento(): PrefsAgrupamiento {
  try {
    const raw = localStorage.getItem(CLAVE_AGRUPAMIENTO);
    if (!raw) return { ...PREFS_AGRUPAMIENTO_DEFECTO };
    return normalizarAgrupamiento(JSON.parse(raw) as Partial<PrefsAgrupamiento>);
  } catch {
    return { ...PREFS_AGRUPAMIENTO_DEFECTO };
  }
}

function persistirAgrupamiento(prefs: PrefsAgrupamiento): void {
  try {
    localStorage.setItem(CLAVE_AGRUPAMIENTO, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/** Lectura síncrona para capas MapLibre (sin React). */
export function leerPrefsAgrupamiento(): PrefsAgrupamiento {
  return estadoAgrup;
}

export function guardarPrefsAgrupamiento(parcial: Partial<PrefsAgrupamiento>): void {
  estadoAgrup = normalizarAgrupamiento({ ...estadoAgrup, ...parcial });
  persistirAgrupamiento(estadoAgrup);
  emitirAgrup();
}

export function restablecerPrefsAgrupamiento(): void {
  estadoAgrup = { ...PREFS_AGRUPAMIENTO_DEFECTO };
  persistirAgrupamiento(estadoAgrup);
  emitirAgrup();
}

export function usePrefsAgrupamiento(): PrefsAgrupamiento {
  return useSyncExternalStore(
    (cb) => {
      listenersAgrup.add(cb);
      return () => listenersAgrup.delete(cb);
    },
    () => estadoAgrup,
    () => PREFS_AGRUPAMIENTO_DEFECTO,
  );
}
