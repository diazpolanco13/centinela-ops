import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { etiquetaCorta } from "@/data/traccar";
import {
  ETIQUETA_VENTANA,
  VENTANAS_ESTELA_MIN,
  type VentanaEstelaMin,
} from "@/data/recorridoUnidad";
import { COLOR_ESTADO, type UnidadEnMapa } from "@/data/unidadesMock";
import { cn } from "@/lib/utils";

type Props = {
  unidades: UnidadEnMapa[];
  selectedId: string | null;
  ventanaMin: VentanaEstelaMin;
  onSeleccionar: (id: string) => void;
  onVentana: (min: VentanaEstelaMin) => void;
};

export function PanelEstela({
  unidades,
  selectedId,
  ventanaMin,
  onSeleccionar,
  onVentana,
}: Props) {
  const ordenadas = [...unidades].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <div
      data-estela-panel
      className="map-controls-overlay pointer-events-none absolute left-3 top-3 z-40 w-[252px] max-w-[calc(100%-5.5rem)]"
    >
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-border bg-card/92 shadow-lg backdrop-blur-xl">
        <div className="border-b border-border px-2.5 py-2">
          <p className="mb-1.5 font-mono text-[9px] tracking-widest text-muted-foreground">ESTELA</p>
          <ButtonGroup
            orientation="horizontal"
            className="w-full overflow-hidden rounded-lg border border-border"
          >
            {VENTANAS_ESTELA_MIN.map((min) => {
              const activo = ventanaMin === min;
              return (
                <Button
                  key={min}
                  type="button"
                  variant={activo ? "default" : "outline"}
                  size="sm"
                  aria-pressed={activo}
                  disabled={!selectedId}
                  onClick={() => onVentana(min)}
                  className="h-7 flex-1 rounded-none border-0 shadow-none"
                >
                  {ETIQUETA_VENTANA[min]}
                </Button>
              );
            })}
          </ButtonGroup>
        </div>
        <ScrollArea className="h-[min(22rem,46vh)]">
          <ul className="flex flex-col gap-0.5 p-1.5">
            {ordenadas.map((u) => {
              const sel = u.id === selectedId;
              return (
                <li key={u.id}>
                  <Button
                    type="button"
                    variant={sel ? "default" : "outline"}
                    size="sm"
                    aria-pressed={sel}
                    onClick={() => onSeleccionar(u.id)}
                    className={cn(
                      "h-8 w-full justify-start gap-2 px-2 font-normal",
                      sel && "bg-cyan-400/20 text-cyan-50 hover:bg-cyan-400/25",
                    )}
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: COLOR_ESTADO[u.estado] }}
                      aria-hidden
                    />
                    <span className="truncate font-mono text-[11px]">{etiquetaCorta(u.nombre)}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{u.nombre}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </div>
    </div>
  );
}
