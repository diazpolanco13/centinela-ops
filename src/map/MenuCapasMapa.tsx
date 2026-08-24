// Selector de capas base del mapa (reutilizable en centros y residencia).

import { useState } from "react";
import { Check, Layers } from "lucide-react";
import { BASES_DISPONIBLES, type BaseMapa } from "@/map/estiloMapa";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  baseMapa: BaseMapa;
  onCambiarBase: (base: BaseMapa) => void;
  locales?: boolean;
  onCambiarLocales?: (activo: boolean) => void;
  /** Bases visibles en el menú (default: dark matter, calles claro, osm, híbrido, positron). */
  bases?: BaseMapa[];
  className?: string;
  size?: "sm" | "default";
}

const BASES_RESIDENCIA: BaseMapa[] = [
  "dark-matter",
  "calles-claro",
  "positron",
  "osm",
  "hibrido",
];

export function MenuCapasMapa({
  baseMapa,
  onCambiarBase,
  locales,
  onCambiarLocales,
  bases = BASES_RESIDENCIA,
  className,
  size = "sm",
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const baseActiva = BASES_DISPONIBLES.find((b) => b.valor === baseMapa);
  const opciones = BASES_DISPONIBLES.filter((b) => bases.includes(b.valor));
  const btnSize = size === "sm" ? "size-8" : "h-10 w-10";

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                "inline-flex items-center justify-center p-0 border-border/60 bg-card/95 shadow-sm backdrop-blur-sm hover:bg-muted/80 [&_svg]:size-4",
                btnSize,
                abierto && "bg-primary/15 text-primary",
                className,
              )}
              aria-label={`Vista del mapa: ${baseActiva?.label ?? baseMapa}`}
            >
              <Layers className="size-4" aria-hidden />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={8}>
          Vista del mapa
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={8}
        className="max-h-[min(24rem,70dvh)] w-56 overflow-y-auto p-1.5"
      >
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Vista del mapa
        </p>
        <div className="flex flex-col gap-0.5">
          {opciones.map((b) => {
            const activa = baseMapa === b.valor;
            return (
              <Button
                key={b.valor}
                type="button"
                variant={activa ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 w-full justify-between gap-2 px-2 font-normal",
                  activa && "font-medium text-primary",
                )}
                onClick={() => {
                  onCambiarBase(b.valor);
                  setAbierto(false);
                }}
              >
                <span>{b.label}</span>
                {activa ? <Check className="size-3.5 shrink-0" /> : null}
              </Button>
            );
          })}
        </div>
        {onCambiarLocales ? (
          <>
            <Separator className="my-1.5" />
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <Label htmlFor="overlay-locales" className="text-sm font-normal">
                Locales OSM
              </Label>
              <Switch
                id="overlay-locales"
                size="sm"
                checked={Boolean(locales)}
                onCheckedChange={onCambiarLocales}
              />
            </div>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
