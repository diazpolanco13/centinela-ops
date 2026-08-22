import { lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { initAuth, useSesion } from "./data/authStub";
import { CapaLogin } from "./components/CapaLogin";
import { MarcaAgua } from "./components/MarcaAgua";
import { SplashIntro } from "./components/SplashIntro";
import { AppShell } from "./layouts/AppShell";
import { SectionSuspense } from "./components/SectionSuspense";
import { MapaSectionSkeleton } from "./features/mapa/MapaSectionSkeleton";
import { BrainViewSkeleton } from "./features/brain/BrainViewSkeleton";
import { PlaceholderView } from "./features/placeholder/PlaceholderView";

const importMapaView = () => import("./features/mapa/MapaView");
const importBrainView = () => import("./features/brain/BrainView");
const importConfigView = () => import("./features/config/ConfigView");

const MapaView = lazy(() => importMapaView().then((m) => ({ default: m.MapaView })));
const BrainView = lazy(() => importBrainView().then((m) => ({ default: m.BrainView })));
const ConfigView = lazy(() => importConfigView().then((m) => ({ default: m.ConfigView })));

function Stub({ titulo }: { titulo: string }) {
  return (
    <PlaceholderView
      titulo={titulo}
      detalle="Módulo pendiente. El chrome (mapa, capas, menú, login) ya está. Dominio operativo se cablea al desplegar."
    />
  );
}

export function App() {
  const sesion = useSesion();
  const location = useLocation();
  const [arrancando, setArrancando] = useState(true);
  const enMapa = location.pathname === "/" || location.pathname === "/mapa";

  useEffect(() => {
    void importMapaView().catch(() => undefined);
    void initAuth().finally(() => setArrancando(false));
  }, []);

  const contenido = (() => {
    if (arrancando) return null;
    return (
      <>
        {sesion ? (
          <Routes>
            <Route element={<AppShell sesion={sesion} />}>
              <Route
                path="/"
                element={
                  <SectionSuspense fallback={<MapaSectionSkeleton />}>
                    <MapaView />
                  </SectionSuspense>
                }
              />
              <Route
                path="/brain"
                element={
                  <SectionSuspense fallback={<BrainViewSkeleton />}>
                    <BrainView />
                  </SectionSuspense>
                }
              />
              <Route path="/zonas" element={<Stub titulo="Zonas de Interés Operativo" />} />
              <Route path="/pois" element={<Stub titulo="Puntos de Interés" />} />
              <Route path="/misiones" element={<Stub titulo="Misiones" />} />
              <Route path="/unidades" element={<Stub titulo="Unidades" />} />
              <Route path="/reportes" element={<Stub titulo="Reportes de inteligencia" />} />
              <Route path="/alertas" element={<Stub titulo="Alertas" />} />
              <Route
                path="/configuracion"
                element={
                  <SectionSuspense fallback={<Stub titulo="Configuración" />}>
                    <ConfigView />
                  </SectionSuspense>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        ) : null}
        {sesion?.user.marca_agua && <MarcaAgua usuario={sesion.user} />}
        <CapaLogin listo={!arrancando} sesion={sesion} />
      </>
    );
  })();

  return (
    <SplashIntro listo={!arrancando} esperarOrbitaMapa={!!sesion && enMapa}>
      {contenido}
    </SplashIntro>
  );
}
