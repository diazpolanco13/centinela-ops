export interface MigaPan {
  label: string;
  to?: string;
}

const RUTAS: { test: (p: string) => boolean; migas: MigaPan[] }[] = [
  { test: (p) => p === "/" || p === "/mapa", migas: [{ label: "Mapa" }] },
  { test: (p) => p.startsWith("/brain"), migas: [{ label: "Mapa", to: "/" }, { label: "Brain" }] },
  { test: (p) => p.startsWith("/zonas"), migas: [{ label: "Mapa", to: "/" }, { label: "Zonas" }] },
  { test: (p) => p.startsWith("/pois"), migas: [{ label: "Mapa", to: "/" }, { label: "POIs" }] },
  { test: (p) => p.startsWith("/misiones"), migas: [{ label: "Mapa", to: "/" }, { label: "Misiones" }] },
  { test: (p) => p.startsWith("/unidades"), migas: [{ label: "Mapa", to: "/" }, { label: "Unidades" }] },
  { test: (p) => p.startsWith("/reportes"), migas: [{ label: "Mapa", to: "/" }, { label: "Reportes" }] },
  { test: (p) => p.startsWith("/alertas"), migas: [{ label: "Mapa", to: "/" }, { label: "Alertas" }] },
];

export function migasPanDeRuta(pathname: string): MigaPan[] {
  for (const r of RUTAS) {
    if (r.test(pathname)) return r.migas;
  }
  return [{ label: "Mapa", to: "/" }];
}
