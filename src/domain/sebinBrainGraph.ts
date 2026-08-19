import type { EstadoReporteDia } from "./reporteDiario";
import { META_ESTADO_REPORTE } from "./reporteDiario";

export type SebinBrainKind = "sebin" | "unidad" | "campamento" | "operador";
export type SeveridadBrain = "ok" | "pendiente" | "parcial" | "critica";

const RANK: Record<SeveridadBrain, number> = {
  ok: 0,
  pendiente: 1,
  parcial: 2,
  critica: 3,
};

export const META_SEVERIDAD_BRAIN: Record<SeveridadBrain, { label: string; color: string }> = {
  ok: { label: "Al día", color: "#22c55e" },
  pendiente: { label: "Sin reporte", color: "#64748b" },
  parcial: { label: "Reporte incompleto", color: "#f59e0b" },
  critica: { label: "Alerta crítica", color: "#ef4444" },
};

export type SebinBrainNode = {
  id: string;
  kind: SebinBrainKind;
  label: string;
  sublabel?: string;
  ring: 0 | 1 | 2 | 3;
  color: string;
  severidad: SeveridadBrain;
  camps: number;
  criticos: number;
  reportesOk: number;
  fasesOk?: number;
  estadoReporte?: EstadoReporteDia;
  unidadClave?: string;
  centroId?: string;
  userId?: string;
  reportoHoy?: boolean;
  angle: number;
  radius: number;
};

export type SebinBrainEdge = {
  source: string;
  target: string;
  kind: "supervisa" | "opera" | "asignado";
};

export type SebinBrainGraph = {
  nodes: SebinBrainNode[];
  edges: SebinBrainEdge[];
  dia: string;
  resumen: {
    camps: number;
    unidades: number;
    criticos: number;
    reportesOk: number;
    reportesPendientes: number;
  };
};

export type PulseCentroBrain = {
  critica: boolean;
  estadoReporte: EstadoReporteDia;
  fasesOk: number;
};

export function peorSeveridad(...xs: SeveridadBrain[]): SeveridadBrain {
  let worst: SeveridadBrain = "ok";
  for (const x of xs) {
    if (RANK[x] > RANK[worst]) worst = x;
  }
  return worst;
}

export function severidadCampamento(pulse: PulseCentroBrain): SeveridadBrain {
  if (pulse.critica) return "critica";
  if (pulse.estadoReporte === "completo") return "ok";
  if (pulse.estadoReporte === "pendiente") return "pendiente";
  return "parcial";
}

export function estadoDesdeFases(fasesOk: number, total = 6): EstadoReporteDia {
  if (fasesOk >= total) return "completo";
  if (fasesOk > 1) return "parcial";
  if (fasesOk === 1) return "solo_parte";
  return "pendiente";
}

const SELF_ID = "sebin";
const RING_U = 0.42;
const RING_C = 0.82;

type ZonaMock = {
  id: string;
  nombre: string;
  unidad: string;
  unidadLabel: string;
  color: string;
  pulse: PulseCentroBrain;
};

const ZONAS_MOCK: ZonaMock[] = [
  { id: "z1", nombre: "ZIO Libertador", unidad: "norte", unidadLabel: "Sector Norte", color: "#0d9488", pulse: { critica: false, estadoReporte: "completo", fasesOk: 6 } },
  { id: "z2", nombre: "ZIO Sucre", unidad: "norte", unidadLabel: "Sector Norte", color: "#0d9488", pulse: { critica: true, estadoReporte: "parcial", fasesOk: 3 } },
  { id: "z3", nombre: "ZIO Chacao", unidad: "este", unidadLabel: "Sector Este", color: "#2563eb", pulse: { critica: false, estadoReporte: "completo", fasesOk: 6 } },
  { id: "z4", nombre: "ZIO Baruta", unidad: "este", unidadLabel: "Sector Este", color: "#2563eb", pulse: { critica: false, estadoReporte: "pendiente", fasesOk: 0 } },
  { id: "z5", nombre: "ZIO Hatillo", unidad: "sur", unidadLabel: "Sector Sur", color: "#7c3aed", pulse: { critica: false, estadoReporte: "parcial", fasesOk: 2 } },
];

/** Grafo demo: núcleo → sectores → zonas de interés. */
export function buildSalaBrainGraph(dia = "mock"): SebinBrainGraph {
  const porUnidad = new Map<string, ZonaMock[]>();
  for (const z of ZONAS_MOCK) {
    const list = porUnidad.get(z.unidad) ?? [];
    list.push(z);
    porUnidad.set(z.unidad, list);
  }
  const claves = [...porUnidad.keys()];
  const nU = Math.max(1, claves.length);
  const nodes: SebinBrainNode[] = [];
  const edges: SebinBrainEdge[] = [];
  let totalCriticos = 0;
  let totalOk = 0;
  let totalPend = 0;
  const sevUnidades: SeveridadBrain[] = [];

  claves.forEach((clave, ui) => {
    const camps = porUnidad.get(clave)!;
    const meta = camps[0];
    const angleU = -Math.PI / 2 + (ui / nU) * Math.PI * 2;
    const unidadId = `unidad:${clave}`;
    const sevCamps: SeveridadBrain[] = [];
    let critU = 0;
    let okU = 0;
    const span = (Math.PI * 2) / nU;
    const start = angleU - span * 0.38;
    const end = angleU + span * 0.38;

    camps.forEach((c, ci) => {
      const sev = severidadCampamento(c.pulse);
      sevCamps.push(sev);
      if (c.pulse.critica) {
        critU += 1;
        totalCriticos += 1;
      }
      if (c.pulse.estadoReporte === "completo") {
        okU += 1;
        totalOk += 1;
      }
      if (c.pulse.estadoReporte === "pendiente") totalPend += 1;
      const t = camps.length === 1 ? 0.5 : ci / (camps.length - 1);
      const angleC = start + t * (end - start);
      nodes.push({
        id: `camp:${c.id}`,
        kind: "campamento",
        label: c.nombre,
        ring: 2,
        color: META_SEVERIDAD_BRAIN[sev].color,
        severidad: sev,
        camps: 1,
        criticos: c.pulse.critica ? 1 : 0,
        reportesOk: c.pulse.estadoReporte === "completo" ? 1 : 0,
        fasesOk: c.pulse.fasesOk,
        estadoReporte: c.pulse.estadoReporte,
        unidadClave: clave,
        centroId: c.id,
        angle: angleC,
        radius: RING_C,
      });
      edges.push({ source: unidadId, target: `camp:${c.id}`, kind: "opera" });
    });

    const sevU = peorSeveridad(...sevCamps);
    sevUnidades.push(sevU);
    nodes.push({
      id: unidadId,
      kind: "unidad",
      label: meta.unidadLabel,
      sublabel: `${camps.length} zonas`,
      ring: 1,
      color: meta.color,
      severidad: sevU,
      camps: camps.length,
      criticos: critU,
      reportesOk: okU,
      unidadClave: clave,
      angle: angleU,
      radius: RING_U,
    });
    edges.push({ source: SELF_ID, target: unidadId, kind: "supervisa" });
  });

  const sevCore = peorSeveridad(...sevUnidades);
  nodes.unshift({
    id: SELF_ID,
    kind: "sebin",
    label: "Centinela",
    sublabel: "Sala",
    ring: 0,
    color: META_SEVERIDAD_BRAIN[sevCore].color,
    severidad: sevCore,
    camps: ZONAS_MOCK.length,
    criticos: totalCriticos,
    reportesOk: totalOk,
    angle: 0,
    radius: 0,
  });

  return {
    nodes,
    edges,
    dia,
    resumen: {
      camps: ZONAS_MOCK.length,
      unidades: claves.length,
      criticos: totalCriticos,
      reportesOk: totalOk,
      reportesPendientes: totalPend,
    },
  };
}

export function buildSebinBrainGraph(): SebinBrainGraph {
  return buildSalaBrainGraph();
}

export function posNodoBrain(
  n: Pick<SebinBrainNode, "angle" | "radius">,
  cx: number,
  cy: number,
  scale: number,
): { x: number; y: number } {
  return {
    x: cx + Math.cos(n.angle) * n.radius * scale,
    y: cy + Math.sin(n.angle) * n.radius * scale,
  };
}

export function colorEstadoReporte(estado: EstadoReporteDia | undefined): string {
  if (!estado) return META_SEVERIDAD_BRAIN.pendiente.color;
  return META_ESTADO_REPORTE[estado].color;
}

export { SELF_ID as SEBIN_BRAIN_CORE_ID };

export type OperadorBrain = {
  userId: string;
  username: string;
  label: string;
  centroId: string;
  reportoHoy: boolean;
};

export function idNodoOperador(userId: string, centroId: string): string {
  return `op:${userId}:${centroId}`;
}

export function centroIdDeNodoOperador(id: string): string | null {
  if (!id.startsWith("op:")) return null;
  const i = id.lastIndexOf(":");
  if (i <= 2) return null;
  const centroId = id.slice(i + 1);
  return centroId.length > 0 ? centroId : null;
}

export function etiquetaOperadorBrain(p: Pick<OperadorBrain, "label" | "username">): string {
  const n = p.label.trim();
  if (n) return n;
  if (p.username) return `@${p.username}`;
  return "Operador";
}

export function nodosOperadorDeCamp(
  camp: Pick<SebinBrainNode, "id" | "unidadClave" | "centroId">,
  ops: OperadorBrain[],
): { nodes: SebinBrainNode[]; edges: SebinBrainEdge[] } {
  const centroId = camp.centroId;
  if (!centroId) return { nodes: [], edges: [] };
  const nodes: SebinBrainNode[] = [];
  const edges: SebinBrainEdge[] = [];
  for (const op of ops) {
    const sev: SeveridadBrain = op.reportoHoy ? "ok" : "pendiente";
    const id = idNodoOperador(op.userId, centroId);
    nodes.push({
      id,
      kind: "operador",
      label: etiquetaOperadorBrain(op),
      sublabel: op.reportoHoy ? "En misión" : "Asignado",
      ring: 3,
      color: META_SEVERIDAD_BRAIN[sev].color,
      severidad: sev,
      camps: 0,
      criticos: 0,
      reportesOk: op.reportoHoy ? 1 : 0,
      unidadClave: camp.unidadClave,
      centroId,
      userId: op.userId,
      reportoHoy: op.reportoHoy,
      angle: 0,
      radius: 0,
    });
    edges.push({ source: camp.id, target: id, kind: "asignado" });
  }
  return { nodes, edges };
}
