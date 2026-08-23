import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Globe, Home, LocateFixed, Radio, Settings, X } from "lucide-react";
import { Link } from "react-router-dom";
import { CARACAS_CENTRO } from "@/data/geo";
import { UNIDADES_MOCK, type UnidadEnMapa } from "@/data/unidadesMock";
import { usePosicionesTraccar } from "@/data/usePosicionesTraccar";
import { engancharClicUnidades, montarCapaUnidades, setDataUnidades, aplicarPrefsUnidades } from "@/map/capaUnidades";
import {
  cargarBaseMapa,
  cargarModo3d,
  cargarModoGlobo,
  cargarVistaMapa,
  guardarBaseMapa,
  guardarModo3d,
  guardarModoGlobo,
  guardarVistaMapa,
  usePrefsAgrupamiento,
  VISTA_DEFECTO,
} from "@/data/preferenciasMapa";
import { usePrefsUnidades } from "@/data/preferenciasUnidades";
import {
  calcularReglaEscala,
  zoomParaAnchoMetros,
  type ReglaEscala,
} from "@/map/escalaVista";
import {
  aplicarEdificios3d,
  BASE_MAPA_DEFECTO,
  cancelarAnimacionEdificios3d,
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
import { ControlesMapaIzquierda } from "@/features/mapa/ControlesMapaIzquierda";
import { FichaVehiculo } from "@/features/mapa/FichaVehiculo";
import { PanelEstela } from "@/features/mapa/PanelEstela";
import { SelectoresVistaMapa } from "@/features/mapa/SelectoresVistaMapa";
import {
  VENTANA_ESTELA_DEFECTO_MIN,
  cargarRecorridoUnidad,
  type VentanaEstelaMin,
} from "@/data/recorridoUnidad";
import {
  cargaEstelaVigente,
  destruirEstela,
  mostrarEstela,
  ocultarEstela,
  reinyectarEstela,
  reservarCargaEstela,
  seguirCabezaEstela,
} from "@/map/capaEstela";
import { anchoOverlayIzquierdo } from "@/map/overlayMapa";
import { LogoMini } from "@/components/LogoMini";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function MapaOperativo() {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const listoRef = useRef(false);
  const unidadesRef = useRef<UnidadEnMapa[]>(UNIDADES_MOCK);
  const selectedIdRef = useRef<string | null>(null);
  const ventanaMinRef = useRef<VentanaEstelaMin>(VENTANA_ESTELA_DEFECTO_MIN);
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
  const modo3dPrevioRef = useRef(modo3d);
  const [modoGlobo, setModoGlobo] = useState(() => cargarModoGlobo() ?? false);
  const [reglaEscala, setReglaEscala] = useState<ReglaEscala | undefined>();
  const [fallback, setFallback] = useState<InfoFallbackBaseMapa | null>(null);
  const [gpsActivo, setGpsActivo] = useState(false);
  const [ocultarAvisoTraccar, setOcultarAvisoTraccar] = useState(false);
  const [unidades, setUnidades] = useState<UnidadEnMapa[]>(UNIDADES_MOCK);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ventanaMin, setVentanaMin] = useState<VentanaEstelaMin>(VENTANA_ESTELA_DEFECTO_MIN);
  const [panelVehiculosAbierto, setPanelVehiculosAbierto] = useState(true);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const prefsUnidades = usePrefsUnidades();
  const prefsAgrupamiento = usePrefsAgrupamiento();

  ventanaMinRef.current = ventanaMin;

  const { error: errorTraccar } = usePosicionesTraccar((next) => {
    unidadesRef.current = next;
    setUnidades(next);
    const map = mapRef.current;
    if (!map || !listoRef.current) return;
    setDataUnidades(map, next, selectedIdRef.current);
    const sel = selectedIdRef.current;
    if (!sel) return;
    const u = next.find((x) => x.id === sel);
    if (u) seguirCabezaEstela(map, sel, u.lngLat);
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !listoRef.current) return;
    aplicarPrefsUnidades(map, unidadesRef.current, selectedIdRef.current);
  }, [prefsUnidades, prefsAgrupamiento]);

  useEffect(() => {
    setOcultarAvisoTraccar(false);
  }, [errorTraccar]);

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

  function aplicarCapaUnidades(map: maplibregl.Map) {
    void montarCapaUnidades(map, unidadesRef.current, selectedIdRef.current);
    reinyectarEstela(map);
  }

  async function cargarEstelaDeUnidad(
    id: string,
    ventana: VentanaEstelaMin,
    opts?: { fit?: boolean },
  ) {
    const map = mapRef.current;
    if (!map || !listoRef.current) return;
    const unidad = unidadesRef.current.find((u) => u.id === id);
    const signal = reservarCargaEstela(map, id);
    try {
      const rec = await cargarRecorridoUnidad(
        id,
        ventana,
        unidad?.lngLat,
        signal,
        unidad?.telemetria?.lastFixMs,
      );
      if (signal.aborted || !cargaEstelaVigente(map, id) || !mapRef.current) return;
      const viva = unidadesRef.current.find((u) => u.id === id);
      mostrarEstela(mapRef.current, rec.coords, rec.paradas, {
        fit: (opts?.fit ?? true) && !introEnCursoRef.current,
        cabeza: viva?.lngLat,
      });
    } catch (err) {
      if (signal.aborted) return;
      console.warn("estela: no se pudo cargar el recorrido", err);
    }
  }

  function volarAUnidad(lngLat: [number, number]) {
    const map = mapRef.current;
    if (!map || !listoRef.current || introEnCursoRef.current) return;
    if (!Number.isFinite(lngLat[0]) || !Number.isFinite(lngLat[1])) return;
    const left = anchoOverlayIzquierdo(map.getContainer());
    map.flyTo({
      center: lngLat,
      zoom: Math.max(map.getZoom(), 16),
      duration: 900,
      essential: true,
      offset: [left / 2, 0],
    });
  }

  function aplicarSeleccion(id: string | null, opts?: { fitEstela?: boolean }) {
    selectedIdRef.current = id;
    setSelectedId(id);
    const map = mapRef.current;
    if (!map || !listoRef.current) return;
    if (id) void cargarEstelaDeUnidad(id, ventanaMinRef.current, { fit: opts?.fitEstela ?? true });
    else ocultarEstela(map);
  }

  function seleccionarDesdeLista(id: string) {
    const unidad = unidadesRef.current.find((u) => u.id === id);
    if (id !== selectedIdRef.current) {
      aplicarSeleccion(id, { fitEstela: false });
      const map = mapRef.current;
      if (map && listoRef.current) setDataUnidades(map, unidadesRef.current, id);
    }
    if (unidad) volarAUnidad(unidad.lngLat);
  }

  function cambiarVentanaEstela(min: VentanaEstelaMin) {
    setVentanaMin(min);
    ventanaMinRef.current = min;
    const id = selectedIdRef.current;
    if (id) void cargarEstelaDeUnidad(id, min);
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
    const animarToggle3d = modo3dPrevioRef.current !== con3d;
    modo3dPrevioRef.current = con3d;

    if (esBaseEstiloExterno(base)) {
      if (modoEstiloRef.current === "dark-matter") {
        aplicarEdificios3d(map, con3d, { animar: animarToggle3d });
        sincronizarPitch3d(map, con3d);
        aplicarProyeccionGlobo(map, modoGloboRef.current);
        aplicarCapaUnidades(map);
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
        aplicarCapaUnidades(mapRef.current);
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
        aplicarCapaUnidades(mapRef.current);
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
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;
    map.on("moveend", programarPersistirVista);
    map.on("move", actualizarEscalaVista);
    map.on("zoom", actualizarEscalaVista);
    map.on("resize", actualizarEscalaVista);

    let cancelarIntro: (() => void) | null = null;
    let quitarClicUnidades: (() => void) | null = null;
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

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(map.getContainer());

    map.on("load", () => {
      listoRef.current = true;
      window.clearTimeout(timeoutCarto);
      map.resize();
      aplicarCapaUnidades(map);
      quitarClicUnidades = engancharClicUnidades(map, {
        getUnidades: () => unidadesRef.current,
        getSelectedId: () => selectedIdRef.current,
        setSelectedId: aplicarSeleccion,
      });
      aplicarBase();
      actualizarEscalaVista();
      if (hacerIntro) {
        aplicarProyeccionGlobo(map, true);
        map.resize();
        map.triggerRepaint();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!mapRef.current) return;
            map.resize();
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
      quitarClicUnidades?.();
      destruirEstela(map);
      window.clearTimeout(timeoutCarto);
      window.clearTimeout(persistirTimer.current);
      ro.disconnect();
      cancelarAnimacionEdificios3d();
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

  const unidadFicha = selectedId ? unidades.find((u) => u.id === selectedId) : undefined;

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
    <div className="relative h-full min-h-0 w-full bg-[#0c0f12]">
      <div ref={contenedorRef} className="h-full w-full" />
      <ControlesMapaIzquierda
        panelAbierto={panelVehiculosAbierto}
        busquedaAbierta={busquedaAbierta}
        onTogglePanel={() => {
          setPanelVehiculosAbierto((v) => {
            if (v) setBusquedaAbierta(false);
            return !v;
          });
        }}
        onToggleBusqueda={() => {
          setBusquedaAbierta((v) => {
            const next = !v;
            if (next) setPanelVehiculosAbierto(true);
            return next;
          });
        }}
        panel={
          panelVehiculosAbierto ? (
            <PanelEstela
              unidades={unidades}
              selectedId={selectedId}
              ventanaMin={ventanaMin}
              busquedaAbierta={busquedaAbierta}
              onSeleccionar={seleccionarDesdeLista}
              onVentana={cambiarVentanaEstela}
              onCerrar={() => {
                setPanelVehiculosAbierto(false);
                setBusquedaAbierta(false);
              }}
              onCerrarBusqueda={() => setBusquedaAbierta(false)}
            />
          ) : null
        }
      />
      {fallback && (
        <AvisoFallbackBaseMapa
          info={fallback}
          onReintentar={() => setFallback(null)}
          onCerrar={() => setFallback(null)}
        />
      )}
      {errorTraccar && !ocultarAvisoTraccar && (
        <div
          className="pointer-events-none absolute inset-x-0 top-2 z-40 flex justify-center px-2 sm:top-3 sm:px-4"
          role="status"
        >
          <Alert
            variant="destructive"
            className="pointer-events-auto w-full max-w-lg border-amber-500/60 bg-background/95 shadow-lg backdrop-blur-sm supports-[backdrop-filter]:bg-background/90"
          >
            <Radio className="text-amber-600 dark:text-amber-400" />
            <AlertTitle className="pr-8 text-foreground">Traccar no conectado</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              <p>{errorTraccar}</p>
            </AlertDescription>
            <AlertAction>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setOcultarAvisoTraccar(true)}
                aria-label="Cerrar aviso"
              >
                <X />
              </Button>
            </AlertAction>
          </Alert>
        </div>
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
              <Button asChild variant="outline" size="icon" className="h-10 w-10 border-0 shadow-none">
                <Link to="/configuracion" aria-label="Ajustes de visualización">
                  <Settings className="size-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Visualización</TooltipContent>
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
      {unidadFicha && (
        <FichaVehiculo
          key={unidadFicha.id}
          unidad={unidadFicha}
          onCerrar={() => {
            aplicarSeleccion(null);
            const map = mapRef.current;
            if (map && listoRef.current) setDataUnidades(map, unidadesRef.current, null);
          }}
        />
      )}
      <LogoMini position="bottom-left" onClick={centrarCaracas} />
    </div>
  );
}
