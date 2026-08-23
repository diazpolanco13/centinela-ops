import type { ReactNode } from "react";
import { PanelLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  panelAbierto: boolean;
  busquedaAbierta: boolean;
  onTogglePanel: () => void;
  onToggleBusqueda: () => void;
  panel: ReactNode;
};

export function ControlesMapaIzquierda({
  panelAbierto,
  busquedaAbierta,
  onTogglePanel,
  onToggleBusqueda,
  panel,
}: Props) {
  return (
    <div className="map-controls-overlay pointer-events-none absolute left-3 top-3 z-40 flex items-start gap-2">
      <ButtonGroup
        orientation="vertical"
        className="pointer-events-auto overflow-hidden rounded-xl border border-border bg-card/92 shadow-lg backdrop-blur-xl"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-pressed={panelAbierto}
              aria-label={panelAbierto ? "Ocultar panel de vehículos" : "Mostrar panel de vehículos"}
              onClick={onTogglePanel}
              className={cn(
                "h-10 w-10 border-0 shadow-none",
                panelAbierto && "bg-primary/15 text-primary",
              )}
            >
              <PanelLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {panelAbierto ? "Ocultar vehículos" : "Mostrar vehículos"}
          </TooltipContent>
        </Tooltip>
        <ButtonGroupSeparator orientation="horizontal" className="bg-border" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-pressed={busquedaAbierta}
              aria-label={busquedaAbierta ? "Cerrar búsqueda" : "Buscar vehículo"}
              onClick={onToggleBusqueda}
              className={cn(
                "h-10 w-10 border-0 shadow-none",
                busquedaAbierta && "bg-primary/15 text-primary",
              )}
            >
              <Search className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Buscar</TooltipContent>
        </Tooltip>
      </ButtonGroup>

      {panel ? (
        <div className="w-[min(22rem,calc(100vw-6rem))] min-w-0">{panel}</div>
      ) : null}
    </div>
  );
}
