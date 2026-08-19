import { useEffect, useRef, useState } from "react";
import { UNIDADES_MOCK, type UnidadEnMapa } from "@/data/unidadesMock";
import {
  aplicarDevices,
  aplicarPositions,
  fusionarUnidades,
  type TraccarDevice,
  type TraccarPosition,
} from "@/data/traccar";

const RECONNECT_MS = 4000;
const WS_LOGOUT_CODE = 4000;

type FuenteUnidades = "traccar" | "mock";

type MensajeSocket = {
  devices?: TraccarDevice[];
  positions?: TraccarPosition[];
};

function tokenTraccar(): string | undefined {
  const raw = import.meta.env.VITE_TRACCAR_TOKEN as string | undefined;
  const token = raw?.trim();
  return token || undefined;
}

async function leerJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

function esJson(res: Response): boolean {
  return (res.headers.get("content-type") ?? "").includes("json");
}

export function usePosicionesTraccar(onUnidades: (unidades: UnidadEnMapa[]) => void): {
  conectado: boolean;
  fuente: FuenteUnidades;
  error: string | null;
} {
  const onUnidadesRef = useRef(onUnidades);
  onUnidadesRef.current = onUnidades;

  const [conectado, setConectado] = useState(false);
  const [fuente, setFuente] = useState<FuenteUnidades>("mock");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    let socket: WebSocket | null = null;
    let reconnectTimer = 0;
    const ac = new AbortController();
    const devices = new Map<number, TraccarDevice>();
    const positions = new Map<number, TraccarPosition>();

    const emitir = (unidades: UnidadEnMapa[]) => {
      if (!cancelado) onUnidadesRef.current(unidades);
    };

    const publicar = () => emitir(fusionarUnidades(devices, positions));

    const usarMock = (mensaje: string | null) => {
      if (cancelado) return;
      setFuente("mock");
      setConectado(false);
      setError(mensaje);
      emitir(UNIDADES_MOCK);
    };

    const snapshot = async (signal?: AbortSignal): Promise<"ok" | "auth" | "error"> => {
      const [devicesRes, positionsRes] = await Promise.all([
        fetch("/api/devices", { credentials: "include", signal }),
        fetch("/api/positions", { credentials: "include", signal }),
      ]);
      if (devicesRes.status === 401 || positionsRes.status === 401) return "auth";
      if (!devicesRes.ok || !positionsRes.ok || !esJson(devicesRes) || !esJson(positionsRes)) {
        return "error";
      }
      aplicarDevices(devices, await leerJson<TraccarDevice[]>(devicesRes));
      aplicarPositions(positions, await leerJson<TraccarPosition[]>(positionsRes));
      publicar();
      return "ok";
    };

    const abrirSocket = () => {
      if (cancelado) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const next = new WebSocket(`${protocol}//${window.location.host}/api/socket`);
      socket = next;

      next.onopen = () => {
        if (cancelado || socket !== next) return;
        setConectado(true);
        setFuente("traccar");
        setError(null);
      };

      next.onmessage = (ev) => {
        if (cancelado || socket !== next) return;
        let data: MensajeSocket;
        try {
          data = JSON.parse(String(ev.data)) as MensajeSocket;
        } catch {
          return;
        }
        if (data.devices) aplicarDevices(devices, data.devices);
        if (data.positions) aplicarPositions(positions, data.positions);
        if (data.devices || data.positions) publicar();
      };

      next.onclose = () => {
        void (async () => {
          if (cancelado || socket !== next) return;
          setConectado(false);
          try {
            const snap = await snapshot();
            if (cancelado) return;
            if (snap === "auth") {
              usarMock("Traccar: sin autorización. Usando unidades de muestra.");
              return;
            }
          } catch {
            // red caída: reintenta WS igual
          }
          if (cancelado) return;
          window.clearTimeout(reconnectTimer);
          reconnectTimer = window.setTimeout(abrirSocket, RECONNECT_MS);
        })();
      };
    };

    const token = tokenTraccar();
    if (!token) {
      usarMock(null);
      return () => {
        cancelado = true;
        ac.abort();
      };
    }

    void (async () => {
      try {
        const session = await fetch(`/api/session?token=${encodeURIComponent(token)}`, {
          credentials: "include",
          signal: ac.signal,
        });
        if (cancelado) return;
        if (!session.ok || !esJson(session)) {
          const rechazo = session.status === 401 || session.status === 404;
          usarMock(
            rechazo
              ? "Traccar rechazó el token. Usando unidades de muestra."
              : "No se pudo abrir sesión Traccar. Usando unidades de muestra.",
          );
          return;
        }
        const snap = await snapshot(ac.signal);
        if (cancelado) return;
        if (snap === "auth") {
          usarMock("Traccar: sin autorización. Usando unidades de muestra.");
          return;
        }
        if (snap === "error") {
          usarMock("Traccar no respondió el snapshot. Usando unidades de muestra.");
          return;
        }
        setFuente("traccar");
        setError(null);
        abrirSocket();
      } catch {
        if (!cancelado) usarMock("No se pudo conectar a Traccar. Usando unidades de muestra.");
      }
    })();

    return () => {
      cancelado = true;
      ac.abort();
      window.clearTimeout(reconnectTimer);
      if (socket && socket.readyState < WebSocket.CLOSING) {
        socket.close(WS_LOGOUT_CODE);
      }
    };
  }, []);

  return { conectado, fuente, error };
}
