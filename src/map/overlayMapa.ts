/** Overlay izquierdo del mapa (panel ESTELA). */

export const SEL_PANEL_ESTELA = "[data-estela-panel]";

/** Distancia desde el borde izquierdo del mapa hasta el panel. */
export function anchoOverlayIzquierdo(mapEl?: HTMLElement | null): number {
  const el = document.querySelector<HTMLElement>(SEL_PANEL_ESTELA);
  if (!el) return 0;
  const origen = mapEl?.getBoundingClientRect().left ?? 0;
  return Math.max(0, Math.round(el.getBoundingClientRect().right - origen));
}
