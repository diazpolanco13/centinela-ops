import type { EstadoUnidad, TelemetriaUnidad, UnidadEnMapa } from "@/data/unidadesMock";

const KN_A_KMH = 1.852;
const BATERIA_CRITICA_V = 3.6;

export const ETIQUETA_ESTADO: Record<EstadoUnidad, string> = {
  en_zona: "En zona",
  en_ruta: "En ruta",
  detenida: "Detenido",
  sin_senal: "Sin señal",
};

export function kmhDeNudos(kn: number | undefined): number {
  if (!Number.isFinite(kn)) return 0;
  return Math.round((kn as number) * KN_A_KMH);
}

export function bateriaCritica(v: number | undefined): boolean {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v < BATERIA_CRITICA_V;
}

export function relativoDesde(ms: number | undefined, ahora: number): string | undefined {
  if (!ms || !Number.isFinite(ms)) return undefined;
  const s = Math.max(0, Math.round((ahora - ms) / 1000));
  if (s < 45) return "ahora";
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

export function textoFilaUnidad(unidad: UnidadEnMapa, ahora: number): string {
  const t = unidad.telemetria;
  if (unidad.estado === "sin_senal") {
    const rel = relativoDesde(t?.lastUpdateMs ?? t?.lastFixMs, ahora);
    return rel ? `sin señal · ${rel}` : "sin señal";
  }
  if (unidad.estado === "en_ruta") {
    const kmh = kmhDeNudos(t?.speedKn);
    return kmh > 0 ? `${kmh} km/h` : "en ruta";
  }
  const mov = relativoDesde(t?.lastMotionMs, ahora);
  if (unidad.estado === "en_zona") {
    return mov ? `en zona · ${mov}` : "en zona";
  }
  return mov ? `detenido · ${mov}` : "detenido";
}

export function etiquetaCategoria(category: string | undefined): string {
  switch (category) {
    case "scooter":
      return "Moto";
    case "motorcycle":
      return "Motocicleta";
    case "person":
      return "Persona";
    case "car":
      return "Vehículo";
    default:
      return category ? category : "Unidad";
  }
}

export function telemetriaDe(unidad: UnidadEnMapa): TelemetriaUnidad | undefined {
  return unidad.telemetria;
}
