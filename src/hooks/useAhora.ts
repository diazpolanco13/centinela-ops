import { useEffect, useState } from "react";

/** Reloj lento para textos “hace X min” sin re-render por segundo. */
export function useAhora(intervaloMs = 30_000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}
