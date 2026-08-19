export type EstadoReporteDia = "completo" | "parcial" | "solo_parte" | "pendiente";

export const META_ESTADO_REPORTE: Record<EstadoReporteDia, { label: string; color: string }> = {
  completo: { label: "Completo", color: "#22c55e" },
  parcial: { label: "Parcial", color: "#f59e0b" },
  solo_parte: { label: "Solo parte numérico", color: "#38bdf8" },
  pendiente: { label: "Sin reporte", color: "#64748b" },
};
