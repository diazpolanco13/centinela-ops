import { useSyncExternalStore } from "react";
import { resetearEstadoIntroMapa } from "@/lib/introMapa";

export type Rol = "analista" | "supervisor" | "jefe_sala";

export interface Usuario {
  sub: string;
  username: string;
  nombre: string | null;
  rol: Rol;
  hash_id?: string | null;
  marca_agua?: boolean;
}

export interface Sesion {
  token: string;
  user: Usuario;
}

const CLAVE = "centinela-ops-sesion";
const listeners = new Set<() => void>();
let estado: Sesion | null = leer();

function leer(): Sesion | null {
  try {
    const raw = sessionStorage.getItem(CLAVE);
    if (!raw) return null;
    return JSON.parse(raw) as Sesion;
  } catch {
    return null;
  }
}

function emitir(): void {
  for (const l of listeners) l();
}

export function initAuth(): Promise<void> {
  estado = leer();
  emitir();
  return Promise.resolve();
}

export function useSesion(): Sesion | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => estado,
    () => null,
  );
}

export async function login(usuario: string, password: string): Promise<void> {
  if (!usuario.trim() || !password) {
    throw new Error("Usuario y contraseña requeridos");
  }
  const sesion: Sesion = {
    token: "stub",
    user: {
      sub: "local",
      username: usuario.trim(),
      nombre: usuario.trim(),
      rol: "jefe_sala",
      hash_id: "LOCAL",
      marca_agua: false,
    },
  };
  estado = sesion;
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    /* ignore */
  }
  emitir();
}

export async function cerrarSesion(): Promise<void> {
  estado = null;
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    /* ignore */
  }
  resetearEstadoIntroMapa();
  emitir();
}
