import { useState } from "react";
import { Box, Layers2, Map as MapIcon, Satellite } from "lucide-react";
import type { EstadoUnidad } from "@/data/unidadesMock";
import {
  COLOR_VEHICULO_DEFECTO,
  RANGO_PREFS_UNIDADES,
  guardarPrefsUnidades,
  restablecerPrefsUnidades,
  usePrefsUnidades,
  type EstiloMarcaEstado,
  type SiluetaPrefs,
} from "@/data/preferenciasUnidades";
import {
  RANGO_AGRUPAMIENTO,
  cargarBaseMapa,
  cargarModo3d,
  cargarModoGlobo,
  guardarBaseMapa,
  guardarModo3d,
  guardarModoGlobo,
  guardarPrefsAgrupamiento,
  restablecerPrefsAgrupamiento,
  restablecerPrefsVistaMapa,
  usePrefsAgrupamiento,
} from "@/data/preferenciasMapa";
import {
  BASES_DISPONIBLES,
  BASE_MAPA_CARTO,
  BASE_MAPA_DEFECTO,
  BASE_MAPA_SATELITE,
  type BaseMapa,
} from "@/map/estiloMapa";
import { TIPOS_AUTO } from "@/map/prototiposAutos";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ESTADOS_COLOR: { id: EstadoUnidad; label: string }[] = [
  { id: "en_ruta", label: "En ruta" },
  { id: "en_zona", label: "En zona" },
  { id: "detenida", label: "Detenida" },
  { id: "sin_senal", label: "Sin señal" },
];

const ESTILOS_MARCA: { value: EstiloMarcaEstado; label: string; hint: string }[] = [
  { value: "aura", label: "Aura", hint: "Mancha suave bajo el auto" },
  { value: "disco", label: "Disco", hint: "Puck sólido estilo HUD" },
  { value: "anillo", label: "Anillo", hint: "Aro en el suelo" },
];

const SILUETAS: { value: SiluetaPrefs; label: string }[] = [
  { value: "auto", label: "Automático" },
  ...TIPOS_AUTO.map((t) => ({
    value: t as SiluetaPrefs,
    label: t === "sedan" ? "Sedán" : t === "suv" ? "SUV" : t === "pickup" ? "Pickup" : t === "minivan" ? "Minivan" : "Hatchback",
  })),
];

function fmt(n: number, digitos = 1): string {
  return n.toFixed(digitos);
}

export function ConfigView() {
  const prefs = usePrefsUnidades();
  const agrup = usePrefsAgrupamiento();
  const [baseMapa, setBaseMapa] = useState<BaseMapa>(() => cargarBaseMapa() ?? BASE_MAPA_DEFECTO);
  const [modo3d, setModo3d] = useState(() => cargarModo3d() ?? true);
  const [modoGlobo, setModoGlobo] = useState(() => cargarModoGlobo() ?? false);

  function cambiarBase(base: BaseMapa) {
    setBaseMapa(base);
    guardarBaseMapa(base);
  }

  function cambiar3d(activo: boolean) {
    setModo3d(activo);
    guardarModo3d(activo);
    if (activo && baseMapa !== BASE_MAPA_CARTO) cambiarBase(BASE_MAPA_CARTO);
  }

  function restablecerVista() {
    restablecerPrefsVistaMapa();
    setBaseMapa(BASE_MAPA_DEFECTO);
    setModo3d(true);
    setModoGlobo(false);
  }

  const enCarto = baseMapa === BASE_MAPA_CARTO;
  const enSatelite = baseMapa === BASE_MAPA_SATELITE;

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Configuración</h1>
          <p className="text-sm text-muted-foreground">
            Ajustes de visualización del mapa. Cambios se ven al volver al Mapa.
          </p>
        </div>

        <Tabs defaultValue="visualizacion">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="visualizacion">Visualización</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>General</CardTitle>
                <CardDescription>
                  Tema y notificaciones llegan después. Por ahora solo reset de vehículos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" variant="default" onClick={() => restablecerPrefsUnidades()}>
                  Restablecer vehículos
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visualizacion" className="mt-4 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Vista del mapa</CardTitle>
                <CardDescription>Base, 2D/3D y proyección. Antes estaban en el HUD del mapa.</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup className="gap-6">
                  <Field>
                    <FieldLabel>Modo</FieldLabel>
                    <ButtonGroup className="w-full max-w-xs" aria-label="Modo 2D o 3D">
                      <Button
                        type="button"
                        variant={modo3d ? "default" : "outline"}
                        onClick={() => cambiar3d(true)}
                      >
                        <Box data-icon="inline-start" />
                        3D
                      </Button>
                      <Button
                        type="button"
                        variant={!modo3d ? "default" : "outline"}
                        onClick={() => cambiar3d(false)}
                      >
                        <Layers2 data-icon="inline-start" />
                        2D
                      </Button>
                    </ButtonGroup>
                    <FieldDescription>3D usa Carto Dark Matter con edificios.</FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel>Capa rápida</FieldLabel>
                    <ButtonGroup className="w-full max-w-xs" aria-label="Base MAP o SAT">
                      <Button
                        type="button"
                        variant={enCarto ? "default" : "outline"}
                        onClick={() => cambiarBase(BASE_MAPA_CARTO)}
                      >
                        <MapIcon data-icon="inline-start" />
                        MAP
                      </Button>
                      <Button
                        type="button"
                        variant={enSatelite ? "default" : "outline"}
                        onClick={() => cambiarBase(BASE_MAPA_SATELITE)}
                      >
                        <Satellite data-icon="inline-start" />
                        SAT
                      </Button>
                    </ButtonGroup>
                  </Field>

                  <Field>
                    <FieldLabel>Capa base</FieldLabel>
                    <Select
                      value={baseMapa}
                      onValueChange={(v) => {
                        if (v) cambiarBase(v as BaseMapa);
                      }}
                    >
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Capa base" />
                      </SelectTrigger>
                      <SelectContent>
                        {BASES_DISPONIBLES.map((b) => (
                          <SelectItem key={b.valor} value={b.valor}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field orientation="horizontal" className="items-center justify-between">
                    <FieldLabel htmlFor="cfg-globo">Proyección globo</FieldLabel>
                    <Switch
                      id="cfg-globo"
                      checked={modoGlobo}
                      onCheckedChange={(v) => {
                        setModoGlobo(v);
                        guardarModoGlobo(v);
                      }}
                    />
                  </Field>

                  <Field>
                    <Button type="button" variant="outline" onClick={restablecerVista}>
                      Restablecer vista
                    </Button>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agrupamiento</CardTitle>
                <CardDescription>
                  Junta patrullas cercanas en un círculo con conteo. Clic al grupo acerca hasta separar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup className="gap-6">
                  <Field orientation="horizontal" className="items-center justify-between">
                    <FieldLabel htmlFor="cfg-cluster">Agrupar marcadores</FieldLabel>
                    <Switch
                      id="cfg-cluster"
                      checked={agrup.clustering}
                      onCheckedChange={(v) => guardarPrefsAgrupamiento({ clustering: v })}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="cfg-cluster-r">
                      Radio — {fmt(agrup.clusterRadius, 0)} px
                    </FieldLabel>
                    <Slider
                      id="cfg-cluster-r"
                      min={RANGO_AGRUPAMIENTO.clusterRadius.min}
                      max={RANGO_AGRUPAMIENTO.clusterRadius.max}
                      step={5}
                      disabled={!agrup.clustering}
                      value={[agrup.clusterRadius]}
                      onValueChange={([v]) => {
                        if (v != null) guardarPrefsAgrupamiento({ clusterRadius: v });
                      }}
                    />
                    <FieldDescription>Más radio = grupos más grandes al alejar.</FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="cfg-cluster-z">
                      Separar al zoom — {fmt(agrup.clusterMaxZoom, 0)}
                    </FieldLabel>
                    <Slider
                      id="cfg-cluster-z"
                      min={RANGO_AGRUPAMIENTO.clusterMaxZoom.min}
                      max={RANGO_AGRUPAMIENTO.clusterMaxZoom.max}
                      step={1}
                      disabled={!agrup.clustering}
                      value={[agrup.clusterMaxZoom]}
                      onValueChange={([v]) => {
                        if (v != null) guardarPrefsAgrupamiento({ clusterMaxZoom: v });
                      }}
                    />
                    <FieldDescription>
                      Por encima de este zoom cada auto queda suelto.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <Button type="button" variant="outline" onClick={() => restablecerPrefsAgrupamiento()}>
                      Restablecer agrupamiento
                    </Button>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vehículos</CardTitle>
                <CardDescription>
                  Tamaño, silueta, marca de estado, colores y etiquetas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup className="gap-6">
                  <FieldSet>
                    <FieldLegend variant="label">Tamaño 3D</FieldLegend>
                    <Field>
                      <FieldLabel htmlFor="cfg-px">
                        En pantalla — {fmt(prefs.pxPantalla, 0)} px
                      </FieldLabel>
                      <Slider
                        id="cfg-px"
                        min={RANGO_PREFS_UNIDADES.pxPantalla.min}
                        max={RANGO_PREFS_UNIDADES.pxPantalla.max}
                        step={2}
                        value={[prefs.pxPantalla]}
                        onValueChange={([v]) => {
                          if (v != null) guardarPrefsUnidades({ pxPantalla: v });
                        }}
                      />
                      <FieldDescription>
                        Largo del auto en pantalla a zoom lejos. Cerca pasa a tamaño calle.
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="cfg-calle">
                        Calle (zoom alto) — {fmt(prefs.escalaCalle)}
                      </FieldLabel>
                      <Slider
                        id="cfg-calle"
                        min={RANGO_PREFS_UNIDADES.escalaCalle.min}
                        max={RANGO_PREFS_UNIDADES.escalaCalle.max}
                        step={0.05}
                        value={[prefs.escalaCalle]}
                        onValueChange={([v]) => {
                          if (v != null) guardarPrefsUnidades({ escalaCalle: v });
                        }}
                      />
                      <FieldDescription>Multiplicador geo cuando el auto ya se lee en calle.</FieldDescription>
                    </Field>
                  </FieldSet>

                  <Field orientation="horizontal" className="items-center justify-between">
                    <FieldLabel htmlFor="cfg-labels">Etiquetas</FieldLabel>
                    <Switch
                      id="cfg-labels"
                      checked={prefs.labels}
                      onCheckedChange={(v) => guardarPrefsUnidades({ labels: v })}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Silueta</FieldLabel>
                    <Select
                      value={prefs.silueta}
                      onValueChange={(v) => {
                        if (v) guardarPrefsUnidades({ silueta: v as SiluetaPrefs });
                      }}
                    >
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Silueta" />
                      </SelectTrigger>
                      <SelectContent>
                        {SILUETAS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Automático reparte tipos por id. Forzar aplica a todas.
                    </FieldDescription>
                  </Field>

                  <Field orientation="horizontal" className="items-center justify-between">
                    <FieldLabel htmlFor="cfg-color-auto">Color del vehículo</FieldLabel>
                    <input
                      id="cfg-color-auto"
                      type="color"
                      value={prefs.colorVehiculo ?? COLOR_VEHICULO_DEFECTO}
                      onChange={(e) => guardarPrefsUnidades({ colorVehiculo: e.target.value })}
                      className="h-9 w-14 cursor-pointer rounded-md border border-border bg-card p-1 shadow-sm"
                      aria-label="Color del vehículo"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Marca de estado</FieldLabel>
                    <ButtonGroup className="w-full max-w-xs" aria-label="Estilo de marca de estado">
                      {ESTILOS_MARCA.map((e) => (
                        <Button
                          key={e.value}
                          type="button"
                          variant={prefs.estiloMarca === e.value ? "default" : "outline"}
                          onClick={() => guardarPrefsUnidades({ estiloMarca: e.value })}
                        >
                          {e.label}
                        </Button>
                      ))}
                    </ButtonGroup>
                    <FieldDescription>
                      {ESTILOS_MARCA.find((e) => e.value === prefs.estiloMarca)?.hint ??
                        "Color de estado en el suelo, no en el auto."}
                    </FieldDescription>
                  </Field>

                  <Field orientation="horizontal" className="items-center justify-between">
                    <FieldLabel htmlFor="cfg-pulso">Pulso de marca</FieldLabel>
                    <Switch
                      id="cfg-pulso"
                      checked={prefs.pulsoMarca !== false}
                      onCheckedChange={(v) => guardarPrefsUnidades({ pulsoMarca: v })}
                    />
                  </Field>

                  <FieldSet>
                    <FieldLegend variant="label">Colores por estado</FieldLegend>
                    <FieldDescription>Pintan la marca en el suelo. El auto queda de fábrica.</FieldDescription>
                    <FieldGroup className="gap-3">
                      {ESTADOS_COLOR.map(({ id, label }) => (
                        <Field key={id} orientation="horizontal" className="items-center justify-between">
                          <FieldLabel htmlFor={`cfg-color-${id}`}>{label}</FieldLabel>
                          <input
                            id={`cfg-color-${id}`}
                            type="color"
                            value={prefs.colores[id]}
                            onChange={(e) =>
                              guardarPrefsUnidades({
                                colores: { ...prefs.colores, [id]: e.target.value },
                              })
                            }
                            className="h-9 w-14 cursor-pointer rounded-md border border-border bg-card p-1 shadow-sm"
                            aria-label={`Color ${label}`}
                          />
                        </Field>
                      ))}
                    </FieldGroup>
                  </FieldSet>

                  <Field>
                    <Button type="button" variant="default" onClick={() => restablecerPrefsUnidades()}>
                      Restablecer defaults
                    </Button>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">Se ven al volver al Mapa.</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
