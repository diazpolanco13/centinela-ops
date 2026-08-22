import type { EstadoUnidad } from "@/data/unidadesMock";
import {
  RANGO_PREFS_UNIDADES,
  guardarPrefsUnidades,
  restablecerPrefsUnidades,
  usePrefsUnidades,
  type SiluetaPrefs,
} from "@/data/preferenciasUnidades";
import { TIPOS_AUTO } from "@/map/prototiposAutos";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Configuración</h1>
          <p className="text-sm text-muted-foreground">
            Preferencias de la app. Cambios de mapa se ven al volver al Mapa.
          </p>
        </div>

        <Tabs defaultValue="mapa">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
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

          <TabsContent value="mapa" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Vehículos</CardTitle>
                <CardDescription>
                  Tamaño, silueta, colores y etiquetas de unidades en el mapa.
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

                  <FieldSet>
                    <FieldLegend variant="label">Colores por estado</FieldLegend>
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
            <p className="mt-3 text-xs text-muted-foreground">Se ven al volver al Mapa.</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
