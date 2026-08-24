import { useEffect, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buscarLugares, type LugarEncontrado } from "@/data/buscarLugares";

type Props = {
  onElegirLugar: (lugar: LugarEncontrado) => void;
  onCerrar?: () => void;
};

export function BuscadorLugares({ onElegirLugar, onCerrar }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [consulta, setConsulta] = useState("");
  const [lugares, setLugares] = useState<LugarEncontrado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vacia = consulta.trim().length === 0;

  useEffect(() => {
    const q = consulta.trim();
    if (q.length < 2) {
      setLugares([]);
      setError(null);
      setCargando(false);
      return;
    }
    const ac = new AbortController();
    const t = window.setTimeout(() => {
      setCargando(true);
      void buscarLugares(q, ac.signal)
        .then((rows) => {
          if (ac.signal.aborted) return;
          setLugares(rows);
          setError(null);
        })
        .catch((err: unknown) => {
          if (ac.signal.aborted) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setLugares([]);
          setError("Nominatim no responde.");
        })
        .finally(() => {
          if (!ac.signal.aborted) setCargando(false);
        });
    }, 650);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [consulta]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key !== "Escape") return;
      if (consulta) {
        setConsulta("");
        return;
      }
      onCerrar?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [consulta, onCerrar]);

  return (
    <div className="pointer-events-auto w-[min(20rem,calc(100vw-7rem))] overflow-hidden rounded-xl border border-border bg-card/92 shadow-lg backdrop-blur-xl">
      <div className="p-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            ref={inputRef}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Buscar lugar (Farmatodo, Chacao)."
            aria-label="Buscar lugar"
            className="h-9 pr-9 pl-8"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={vacia ? "Cerrar buscador" : "Limpiar búsqueda"}
            onClick={() => {
              if (vacia) {
                onCerrar?.();
                return;
              }
              setConsulta("");
            }}
            className="absolute top-1/2 right-1 -translate-y-1/2"
          >
            <X />
          </Button>
        </div>
        {vacia ? (
          <p className="px-1 pt-2 text-[12px] text-muted-foreground">Locales OSM. Mínimo 2 letras.</p>
        ) : cargando ? (
          <p className="px-1 pt-2 text-[12px] text-muted-foreground">Buscando…</p>
        ) : error ? (
          <p className="px-1 pt-2 text-[12px] text-muted-foreground">{error}</p>
        ) : lugares.length === 0 ? (
          <p className="px-1 pt-2 text-[12px] text-muted-foreground">Ningún local OSM.</p>
        ) : (
          <ScrollArea className="mt-2 h-[min(16rem,40vh)]">
            <ul className="flex flex-col gap-0.5">
              {lugares.map((l) => (
                <li key={l.id}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onElegirLugar(l)}
                    className="h-auto min-h-9 w-full items-start justify-start gap-2 px-2 py-1.5 font-normal"
                  >
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-sky-400" aria-hidden />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[12px]">{l.nombre}</span>
                      {l.detalle ? (
                        <span className="block truncate text-[10px] text-muted-foreground">{l.detalle}</span>
                      ) : null}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
