import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Globe, Home, LocateFixed } from "lucide-react";
import { CARACAS_CENTRO } from "@/data/geo";
import { UNIDADES_MOCK } from "@/data/unidadesMock";
import {
  cargarBaseMapa,
  cargarModo3d,
  cargarModoGlobo,
  cargarVistaMapa,
  guardarBaseMapa,
  guardarModo3d,
  guardarModoGlobo,
  guardarVistaMapa,
  VISTA_DEFECTO,
} from "@/data/preferenciasMapa";
import {
  calcularReglaEscala,
  zoomParaAnchoMetros,
  type ReglaEscala,
} from "@/map/escalaVista";
import {
  aplicarEdificios3d,
  BASE_MAPA_DEFECTO,
  CAPAS_BASE,
  esBaseEstiloExterno,
  estiloMapaParaBase,
  VISIBILIDAD_BASE,
  type BaseMapa,
} from "@/map/estiloMapa";
import {
  ERRORES_CARTO_PARA_FALLBACK,
  TIMEOUT_CARGA_ESTILO_CARTO_MS,
  baseDependeDeCarto,
  esUrlOErrorCarto,
  siguienteFallbackSinCarto,
  textoErrorMapa,
} from "@/map/disponibilidadCarto";
import { MenuCapasMapa } from "@/map/MenuCapasMapa";
import {
  ANCHO_INTRO_DESTINO_METROS,
  DURACION_INTRO_MAPA_MS,
  TIMEOUT_INTRO_FALLBACK_MS,
  ZOOM_INTRO_ORBITA,
  avisarMapaOrbitaLista,
  marcarIntroMapaLanzada,
  onInicioSalidaOverlay,
  reservarIntroMapa,
} from "@/lib/introMapa";
import { AvisoFallbackBaseMapa, type InfoFallbackBaseMapa } from "@/features/mapa/AvisoFallbackBaseMapa";
import { SelectoresVistaMapa } from "@/features/mapa/SelectoresVistaMapa";
import { LogoMini } from "@/components/LogoMini";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const COLOR_ESTADO: Record<string, string> = {
  en_zona: "#22c55e",
  en_ruta: "#38bdf8",
  detenida: "#f59e0b",
};

export function MapaOperativo() {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const listoRef = useRef(false);
  const marcadores = useRef<Map<string, maplibregl.Marker>>(new Map());
  const introEnCursoRef = useRef(false);
  const hacerIntroRef = useRef(false);
  const modoEstiloRef = useRef<"dark-matter" | "raster">("dark-matter");
  const modo3dRef = useRef(true);
  const modoGloboRef = useRef(false);
  const baseEfectivaRef = useRef<BaseMapa>(BASE_MAPA_DEFECTO);
  const generacionEstiloRef = useRef(0);
  const erroresCartoRef = useRef(0);
  const persistirTimer = useRef(0);

  const [baseMapa, setBaseMapa] = useState<BaseMapa>(() => cargarBaseMapa() ?? BASE_MAPA_DEFECTO);
  const [modo3d, setModo3d] = useState(() => cargarModo3d() ?? true);
  const [modoGlobo, setModoGlobo] = useState(() => cargarModoGlobo() ?? false);
  const [reglaEscala, setReglaEscala] = useState<ReglaEscala | undefined>();
  const [fallback, setFallback] = useState<InfoFallbackBaseMapa | null>(null);
  const [gpsActivo, setGpsActivo] = useState(false);

  baseEfectivaRef.current = fallback?.usada ?? baseMapa;
  modo3dRef.current = modo3d;
  modoGloboRef.current = modoGlobo;

  function persistirVista() {
    const map = mapRef.current;
    if (!map || introEnCursoRef.current) return;
    const c = map.getCenter();
    guardarVistaMapa({ center: [c.lng, c.lat], zoom: map.getZoom() });
  }

  function programarPersistirVista() {
    window.clearTimeout(persistirTimer.current);
    persistirTimer.current = window.setTimeout(persistirVista, 400);
  }

  function actualizarEscalaVista() {
    const map = mapRef.current;
    if (!map) return;
    setReglaEscala(calcularReglaEscala(map.getZoom(), map.getCenter().lat));
  }

  function aplicarVisibilidadRaster(map: maplibregl.Map, base: BaseMapa) {
    const visibles = new Set(VISIBILIDAD_BASE[base] ?? []);
    for (const capa of CAPAS_BASE) {
      if (!map.getLayer(capa)) continue;
      map.setLayoutProperty(capa, "visibility", visibles.has(capa) ? "visible" : "none");
    }
  }

  function aplicarProyeccionGlobo(map: maplibregl.Map, activo: boolean) {
    const usarGlobo = introEnCursoRef.current ? true : activo;
    map.setMinZoom(usarGlobo ? 0 : 3);
    const tipoActual = map.getProjection()?.type;
    const tipoObjetivo = usarGlobo ? "globe" : "mercator";
    if (tipoActual === tipoObjetivo) return;
    map.setProjection({ type: tipoObjetivo });
  }

  function sincronizarPitch3d(map: maplibregl.Map, con3d: boolean) {
    if (introEnCursoRef.current) return;
    if (con3d) {
      if (map.getPitch() < 30) map.easeTo({ pitch: 45, duration: 800 });
      return;
    }
    if (map.getPitch() > 0 || map.getBearing() !== 0) {
      map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    }
  }

  function aplicarBase() {
    const map = mapRef.current;
    if (!map || !listoRef.current) return;
    const base = baseEfectivaRef.current;
    const con3d = modo3dRef.current;

    if (esBaseEstiloExterno(base)) {
      if (modoEstiloRef.current === "dark-matter") {
        aplicarEdificios3d(map, con3d);
        sincronizarPitch3d(map, con3d);
        aplicarProyeccionGlobo(map, modoGloboRef.current);
        return;
      }
      const gen = ++generacionEstiloRef.current;
      modoEstiloRef.current = "dark-matter";
      map.setStyle(estiloMapaParaBase(base));
      map.once("style.load", () => {
        if (generacionEstiloRef.current !== gen || !mapRef.current) return;
        aplicarEdificios3d(mapRef.current, modo3dRef.current);
        sincronizarPitch3d(mapRef.current, modo3dRef.current);
        aplicarProyeccionGlobo(mapRef.current, modoGloboRef.current);
      });
      return;
    }

    if (modoEstiloRef.current === "dark-matter") {
      const gen = ++generacionEstiloRef.current;
      const baseObjetivo = base;
      modoEstiloRef.current = "raster";
      map.setStyle(estiloMapaParaBase(baseObjetivo));
      map.once("style.load", () => {
        if (generacionEstiloRef.current !== gen || !mapRef.current) return;
        aplicarVisibilidadRaster(mapRef.current, baseObjetivo);
        if (mapRef.current.getPitch() > 0 || mapRef.current.getBearing() !== 0) {
          mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 600 });
        }
        aplicarProyeccionGlobo(mapRef.current, modoGloboRef.current);
      });
      return;
    }

    aplicarVisibilidadRaster(map, base);
    aplicarProyeccionGlobo(map, modoGloboRef.current);
  }

  function programarIntroFly(map: maplibregl.Map): () => void {
    let lanzado = false;
    let fallbackId = 0;

    const finalizarIntro = () => {
      introEnCursoRef.current = false;
      if (mapRef.current) aplicarProyeccionGlobo(mapRef.current, modoGloboRef.current);
      actualizarEscalaVista();
      persistirVista();
    };

    const lanzar = () => {
      if (lanzado || !mapRef.current || mapRef.current !== map) return;
      lanzado = true;
      marcarIntroMapaLanzada();
      window.clearTimeout(fallbackId);
      const m = mapRef.current;
      const anchoPx = m.getContainer().clientWidth || 1200;
      const zoomDestino = zoomParaAnchoMetros(ANCHO_INTRO_DESTINO_METROS, CARACAS_CENTRO[1], anchoPx);
      const pitchFinal =
        modoEstiloRef.current === "dark-matter" && modo3dRef.current ? 45 : 0;
      introEnCursoRef.current = true;
      m.setMinZoom(0);
      m.flyTo({
        center: CARACAS_CENTRO,
        zoom: zoomDestino,
        pitch: pitchFinal,
        bearing: 0,
        duration: DURACION_INTRO_MAPA_MS,
        essential: true,
        easing: (t) => 1 - (1 - t) * (1 - t),
      });
      m.once("moveend", finalizarIntro);
    };

    avisarMapaOrbitaLista();
    const unsub = onInicioSalidaOverlay(lanzar);
    fallbackId = window.setTimeout(lanzar, TIMEOUT_INTRO_FALLBACK_MS);
    return () => {
      unsub();
      window.clearTimeout(fallbackId);
    };
  }

  function pintarMarcadores(map: maplibregl.Map) {
    for (const mk of marcadores.current.values()) mk.remove();
    marcadores.current.clear();
    for (const u of UNIDADES_MOCK) {
      const el = document.createElement("div");
      el.className = "flex flex-col items-center";
      el.innerHTML = `<span style="width:14px;height:14px;border-radius:999px;background:${COLOR_ESTADO[u.estado]};box-shadow:0 0 0 3px rgba(0,0,0,.35),0 0 10px ${COLOR_ESTADO[u.estado]}"></span>
        <span style="margin-top:4px;font:600 10px ui-sans-serif,system-ui;color:#ecfdf5;text-shadow:0 1px 3px #000">${u.nombre}</span>`;
      const mk = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat(u.lngLat)
        .addTo(map);
      marcadores.current.set(u.id, mk);
    }
  }

  useEffect(() => {
    if (!contenedorRef.current || mapRef.current) return;
    const hacerIntro = reservarIntroMapa();
    hacerIntroRef.current = hacerIntro;
    introEnCursoRef.current = hacerIntro;
    const vistaGuardada = cargarVistaMapa();
    const vistaInicial = hacerIntro
      ? { center: CARACAS_CENTRO, zoom: ZOOM_INTRO_ORBITA }
      : (vistaGuardada ?? VISTA_DEFECTO);
    const baseInicial = baseMapa;
    modoEstiloRef.current = esBaseEstiloExterno(baseInicial) ? "dark-matter" : "raster";

    const map = new maplibregl.Map({
      container: contenedorRef.current,
      style: estiloMapaParaBase(baseInicial),
      center: vistaInicial.center,
      zoom: vistaInicial.zoom,
      pitch: hacerIntro ? 0 : esBaseEstiloExterno(baseInicial) && modo3dRef.current ? 45 : 0,
      maxZoom: 19,
      minZoom: hacerIntro || modoGloboRef.current ? 0 : 3,
      attributionControl: false,
    });
    mapRef.current = map;
    map.on("moveend", programarPersistirVista);
    map.on("move", actualizarEscalaVista);
    map.on("zoom", actualizarEscalaVista);
    map.on("resize", actualizarEscalaVista);

    let cancelarIntro: (() => void) | null = null;
    let timeoutCarto = 0;
    let cancelado = false;

    map.on("error", (ev) => {
      if (cancelado) return;
      if (!baseDependeDeCarto(baseEfectivaRef.current)) return;
      const texto = textoErrorMapa(ev.error);
      if (!esUrlOErrorCarto(texto)) return;
      erroresCartoRef.current += 1;
      if (erroresCartoRef.current >= ERRORES_CARTO_PARA_FALLBACK) {
        const usada = siguienteFallbackSinCarto(baseEfectivaRef.current);
        if (usada) {
          setFallback({ preferida: baseMapa, usada, motivo: "timeout o bloqueo de basemaps.cartocdn.com" });
        }
      }
    });

    map.on("load", () => {
      listoRef.current = true;
      window.clearTimeout(timeoutCarto);
      pintarMarcadores(map);
      aplicarBase();
      actualizarEscalaVista();
      if (hacerIntro) {
        aplicarProyeccionGlobo(map, true);
        map.resize();
        map.triggerRepaint();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!mapRef.current) return;
            cancelarIntro = programarIntroFly(map);
          });
        });
      }
    });

    if (baseDependeDeCarto(baseInicial)) {
      timeoutCarto = window.setTimeout(() => {
        if (!listoRef.current) {
          const usada = siguienteFallbackSinCarto(baseInicial);
          if (usada) setFallback({ preferida: baseInicial, usada, motivo: "timeout de carga" });
        }
      }, TIMEOUT_CARGA_ESTILO_CARTO_MS);
    }

    return () => {
      cancelado = true;
      cancelarIntro?.();
      window.clearTimeout(timeoutCarto);
      window.clearTimeout(persistirTimer.current);
      for (const mk of marcadores.current.values()) mk.remove();
      marcadores.current.clear();
      map.remove();
      mapRef.current = null;
      listoRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    aplicarBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMapa, fallback, modo3d]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !listoRef.current) return;
    aplicarProyeccionGlobo(map, modoGlobo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoGlobo]);

  function cambiarBase(base: BaseMapa) {
    setFallback(null);
    setBaseMapa(base);
    guardarBaseMapa(base);
  }

  function cambiar3d(activo: boolean) {
    setModo3d(activo);
    guardarModo3d(activo);
  }

  function toggleGlobo() {
    const next = !modoGlobo;
    setModoGlobo(next);
    guardarModoGlobo(next);
  }

  function centrarCaracas() {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: CARACAS_CENTRO, zoom: 12, duration: 1200, essential: true });
  }

  function gps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setGpsActivo(true);
      mapRef.current?.flyTo({
        center: [pos.coords.longitude, pos.coords.latitude],
        zoom: 14,
        duration: 1000,
        essential: true,
      });
    });
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#0c0f12]">
      <div ref={contenedorRef} className="absolute inset-0" />
      {fallback && (
        <AvisoFallbackBaseMapa
          info={fallback}
          onReintentar={() => setFallback(null)}
          onCerrar={() => setFallback(null)}
        />
      )}
      <SelectoresVistaMapa
        baseMapa={baseEfectivaRef.current}
        modo3d={modo3d}
        onCambiarBase={cambiarBase}
        onCambiarModo3d={cambiar3d}
        reglaEscala={reglaEscala}
      />
      <div className="map-controls-overlay pointer-events-none absolute right-3 top-3 z-40">
        <ButtonGroup orientation="vertical" className="pointer-events-auto overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <MenuCapasMapa baseMapa={baseEfectivaRef.current} onCambiarBase={cambiarBase} className="border-0 shadow-none" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "h-10 w-10 border-0 shadow-none",
                  modoGlobo && "bg-primary/15 text-primary",
                )}
                onClick={toggleGlobo}
                aria-label="Proyección globo"
              >
                <Globe className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Globo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 border-0 shadow-none" onClick={centrarCaracas} aria-label="Centrar Caracas">
                <Home className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Centrar Caracas</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn("h-10 w-10 border-0 shadow-none", gpsActivo && "bg-primary/15 text-primary")}
                onClick={gps}
                aria-label="Mi ubicación"
              >
                <LocateFixed className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Mi ubicación</TooltipContent>
          </Tooltip>
        </ButtonGroup>
      </div>
      <LogoMini position="bottom-left" onClick={centrarCaracas} />
    </div>
  );
}
