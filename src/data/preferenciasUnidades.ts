import { useSyncExternalStore } from "react";
import { COLOR_ESTADO, type EstadoUnidad } from "@/data/unidadesMock";

const CLAVE = "centinela-ops-prefs-unidades";

const TIPOS_SILUETA = ["sedan", "suv", "pickup", "minivan", "hatchback", "todoterreno"] as const;
export type SiluetaPrefs = "auto" | (typeof TIPOS_SILUETA)[number];

export const ESTILOS_MARCA_ESTADO = ["aura", "disco", "anillo"] as const;
export type EstiloMarcaEstado = (typeof ESTILOS_MARCA_ESTADO)[number];

export type PrefsUnidades = {
  /** Largo objetivo en px en pantalla (zoom lejos). Cerca usa escalaCalle. */
  pxPantalla: number;
  escalaCalle: number;
  silueta: SiluetaPrefs;
  labels: boolean;
  /** Marca de estado en el suelo. Independiente del color del auto. */
  estiloMarca: EstiloMarcaEstado;
  /** Pintura de carrocería (todas las unidades). */
  colorVehiculo: string;
  /** Pulso de la marca de estado. */
  pulsoMarca: boolean;
  colores: Record<EstadoUnidad, string>;
};

export const COLOR_VEHICULO_DEFECTO = "#e8eaed";

export const PREFS_UNIDADES_DEFECTO: PrefsUnidades = {
  pxPantalla: 48,
  escalaCalle: 1.4,
  silueta: "auto",
  labels: true,
  estiloMarca: "aura",
  colorVehiculo: COLOR_VEHICULO_DEFECTO,
  pulsoMarca: true,
  colores: { ...COLOR_ESTADO },
};

const RANGO = {
  pxPantalla: { min: 24, max: 96 },
  escalaCalle: { min: 0.8, max: 2.5 },
} as const;

const ESTADOS: EstadoUnidad[] = ["en_zona", "en_ruta", "detenida", "sin_senal"];

const listeners = new Set<() => void>();
let estado: PrefsUnidades = cargar();

function emitir(): void {
  for (const l of listeners) l();
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function esHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}

function esSilueta(v: unknown): v is SiluetaPrefs {
  if (v === "auto") return true;
  return typeof v === "string" && (TIPOS_SILUETA as readonly string[]).includes(v);
}

function esEstiloMarca(v: unknown): v is EstiloMarcaEstado {
  return typeof v === "string" && (ESTILOS_MARCA_ESTADO as readonly string[]).includes(v);
}

function normalizar(raw: Partial<PrefsUnidades> | null | undefined): PrefsUnidades {
  const base = PREFS_UNIDADES_DEFECTO;
  const colores = { ...base.colores };
  if (raw?.colores && typeof raw.colores === "object") {
    for (const e of ESTADOS) {
      const c = (raw.colores as Record<string, unknown>)[e];
      if (esHex(c)) colores[e] = c.toLowerCase();
    }
  }
  return {
    pxPantalla: clamp(
      typeof raw?.pxPantalla === "number" ? raw.pxPantalla : base.pxPantalla,
      RANGO.pxPantalla.min,
      RANGO.pxPantalla.max,
    ),
    escalaCalle: clamp(
      typeof raw?.escalaCalle === "number" ? raw.escalaCalle : base.escalaCalle,
      RANGO.escalaCalle.min,
      RANGO.escalaCalle.max,
    ),
    silueta: esSilueta(raw?.silueta) ? raw.silueta : base.silueta,
    labels: typeof raw?.labels === "boolean" ? raw.labels : base.labels,
    estiloMarca: esEstiloMarca(raw?.estiloMarca) ? raw.estiloMarca : base.estiloMarca,
    colorVehiculo: esHex(raw?.colorVehiculo) ? raw.colorVehiculo.toLowerCase() : base.colorVehiculo,
    pulsoMarca: typeof raw?.pulsoMarca === "boolean" ? raw.pulsoMarca : base.pulsoMarca,
    colores,
  };
}

function cargar(): PrefsUnidades {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return { ...PREFS_UNIDADES_DEFECTO, colores: { ...COLOR_ESTADO } };
    return normalizar(JSON.parse(raw) as Partial<PrefsUnidades>);
  } catch {
    return { ...PREFS_UNIDADES_DEFECTO, colores: { ...COLOR_ESTADO } };
  }
}

function persistir(prefs: PrefsUnidades): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/** Lectura síncrona para capas MapLibre/Three (sin React). */
export function leerPrefsUnidades(): PrefsUnidades {
  return estado;
}

export function guardarPrefsUnidades(parcial: Partial<PrefsUnidades>): void {
  estado = normalizar({ ...estado, ...parcial, colores: parcial.colores ?? estado.colores });
  persistir(estado);
  emitir();
}

export function restablecerPrefsUnidades(): void {
  estado = {
    ...PREFS_UNIDADES_DEFECTO,
    colores: { ...COLOR_ESTADO },
    colorVehiculo: COLOR_VEHICULO_DEFECTO,
    pulsoMarca: true,
  };
  persistir(estado);
  emitir();
}

export function usePrefsUnidades(): PrefsUnidades {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => estado,
    () => PREFS_UNIDADES_DEFECTO,
  );
}

export { RANGO as RANGO_PREFS_UNIDADES };
