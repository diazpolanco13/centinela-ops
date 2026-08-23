import { useState } from "react";
import { KeyRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconoCategoriaUnidad } from "@/features/mapa/IconoCategoriaUnidad";
import { etiquetaCorta } from "@/data/traccar";
import {
  bateriaCritica,
  ETIQUETA_ESTADO,
  etiquetaCategoria,
  kmhDeNudos,
  relativoDesde,
} from "@/data/telemetriaUnidad";
import { COLOR_ESTADO, type UnidadEnMapa } from "@/data/unidadesMock";
import { useAhora } from "@/hooks/useAhora";
import { cn } from "@/lib/utils";

type Props = {
  unidad: UnidadEnMapa;
  onCerrar: () => void;
};

function Fila({ label, valor, alerta }: { label: string; valor: string; alerta?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className={cn("font-mono text-[11px]", alerta ? "text-amber-400" : "text-foreground")}>{valor}</span>
    </div>
  );
}

export function FichaVehiculo({ unidad, onCerrar }: Props) {
  const ahora = useAhora();
  const [fotoRota, setFotoRota] = useState(false);
  const t = unidad.telemetria;
  const foto = t?.fotoUrl && !fotoRota ? t.fotoUrl : undefined;
  const kmh = kmhDeNudos(t?.speedKn);
  const ignicion = t?.ignition;
  const mov = relativoDesde(t?.lastMotionMs, ahora);
  const gps = relativoDesde(t?.lastFixMs, ahora);
  const senal = relativoDesde(t?.lastUpdateMs, ahora);
  const batCritica = bateriaCritica(t?.batteryV);

  return (
    <div
      data-ficha-vehiculo
      className="map-controls-overlay pointer-events-none absolute right-3 bottom-3 z-40 w-[min(20rem,calc(100vw-5.5rem))]"
    >
      <Card size="sm" className="pointer-events-auto gap-0 border-border bg-card/92 py-0 shadow-lg backdrop-blur-xl">
        <CardHeader className="border-b border-border px-3 py-2.5">
          <CardTitle className="flex min-w-0 items-center gap-2.5 text-sm">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40">
              {foto ? (
                <img
                  src={foto}
                  alt=""
                  className="size-full object-cover"
                  onError={() => setFotoRota(true)}
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <IconoCategoriaUnidad category={t?.category} className="size-7 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{unidad.nombre}</p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">
                {etiquetaCorta(unidad.nombre)} · {etiquetaCategoria(t?.category)}
              </p>
            </div>
          </CardTitle>
          <CardAction>
            <Button type="button" variant="outline" size="icon-xs" aria-label="Cerrar ficha" onClick={onCerrar}>
              <X />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="gap-1">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: COLOR_ESTADO[unidad.estado] }} />
              {ETIQUETA_ESTADO[unidad.estado]}
            </Badge>
            {t?.alarm && <Badge variant="destructive">{t.alarm}</Badge>}
            {ignicion === true && (
              <Badge variant="secondary" className="gap-1">
                <KeyRound />
                Motor
              </Badge>
            )}
            {ignicion === false && (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <KeyRound />
                Apagado
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {unidad.estado === "en_ruta" && <Fila label="Velocidad" valor={`${kmh} km/h`} />}
            {mov && <Fila label="Último movimiento" valor={mov} />}
            {gps && <Fila label="Último GPS" valor={gps} />}
            {unidad.estado === "sin_senal" && senal && <Fila label="Último contacto" valor={senal} />}
            {typeof t?.batteryV === "number" && (
              <Fila label="Batería GPS" valor={`${t.batteryV.toFixed(1)} V`} alerta={batCritica} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
