import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { login } from "@/data/authStub";
import { LoginBackground, LoginHero } from "@/components/LoginHeroBackground";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function Login() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      void import("@/features/mapa/MapaView");
      await login(usuario.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
      setCargando(false);
    }
  }

  const puedeEnviar = Boolean(usuario && password);

  return (
    <main className="dark relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#05100C] p-6 md:p-10">
      <LoginBackground />
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-0">
        <LoginHero />
        <Card className="border-border/60 bg-card/90 shadow-lg shadow-black/40 backdrop-blur-sm">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-xl font-semibold">Iniciar sesión</CardTitle>
            <CardDescription>
              Acceso restringido. Auth stub local — cualquier usuario y clave.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={entrar}>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="login-usuario">Usuario</FieldLabel>
                  <Input
                    id="login-usuario"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    autoFocus
                    autoComplete="username"
                    placeholder="tu.usuario"
                    disabled={cargando}
                    className="h-9 border-border/80 bg-input/80"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    disabled={cargando}
                    className="h-9 border-border/80 bg-input/80"
                  />
                </Field>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Field>
                  <Button type="submit" size="lg" className="w-full" disabled={cargando || !puedeEnviar}>
                    {cargando ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Entrando…
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 px-4 text-center text-xs leading-relaxed text-[#6B8F80]">
          Sala de situación. Uso exclusivo de personal autorizado.
        </p>
      </div>
    </main>
  );
}
