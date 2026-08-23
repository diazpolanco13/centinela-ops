import { useEffect, useMemo, useRef, useState } from "react";
import { PanelLeftClose, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
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
  busquedaAbierta: boolean;
  onSeleccionar: (id: string) => void;
  onVentana: (min: VentanaEstelaMin) => void;
  onCerrar?: () => void;
  onCerrarBusqueda: () => void;
};

function coinciden(unidad: UnidadEnMapa, consulta: string): boolean {
  const q = consulta.trim().toLowerCase();
  if (!q) return true;
  return (
    unidad.nombre.toLowerCase().includes(q) ||
    etiquetaCorta(unidad.nombre).toLowerCase().includes(q) ||
    unidad.id.toLowerCase().includes(q)
  );
}

export function PanelEstela({
  unidades,
  selectedId,
  ventanaMin,
  busquedaAbierta,
  onSeleccionar,
  onVentana,
  onCerrar,
  onCerrarBusqueda,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [consulta, setConsulta] = useState("");

  useEffect(() => {
    if (busquedaAbierta) {
      inputRef.current?.focus();
      return;
    }
    setConsulta("");
  }, [busquedaAbierta]);

  useEffect(() => {
    if (!busquedaAbierta) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") onCerrarBusqueda();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busquedaAbierta, onCerrarBusqueda]);

  const visibles = useMemo(() => {
    return [...unidades]
      .filter((u) => coinciden(u, consulta))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [unidades, consulta]);

  const vacia = consulta.trim().length === 0;
  const n = unidades.length;

  return (
    <div data-estela-panel className="pointer-events-none w-full">
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-border bg-card/92 shadow-lg backdrop-blur-xl">
        {busquedaAbierta && (
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                ref={inputRef}
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                placeholder="Buscar vehículo, unidad."
                aria-label="Buscar vehículo"
                className="h-9 pr-9 pl-8"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={vacia ? "Cerrar búsqueda" : "Limpiar búsqueda"}
                onClick={() => (vacia ? onCerrarBusqueda() : setConsulta(""))}
                className="absolute top-1/2 right-1 -translate-y-1/2"
              >
                <X />
              </Button>
            </div>
            {vacia ? (
              <p className="px-1 pt-2 text-[12px] text-muted-foreground">
                Escribe para buscar entre {n === 1 ? "el vehículo" : `los ${n} vehículos`}.
              </p>
            ) : visibles.length === 0 ? (
              <p className="px-1 pt-2 text-[12px] text-muted-foreground">Sin coincidencias.</p>
            ) : null}
          </div>
        )}
        <div className="border-b border-border px-2.5 py-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="font-mono text-[9px] tracking-widest text-muted-foreground">ESTELA</p>
            {onCerrar && (
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label="Ocultar panel de vehículos"
                onClick={onCerrar}
              >
                <PanelLeftClose />
              </Button>
            )}
          </div>
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
            {visibles.map((u) => {
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
