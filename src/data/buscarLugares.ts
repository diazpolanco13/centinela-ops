export type LugarEncontrado = {
  id: string;
  nombre: string;
  detalle: string;
  lngLat: [number, number];
};

type NominatimHit = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  type?: string;
  addresstype?: string;
};

/** Caracas: minLon, maxLat, maxLon, minLat (Nominatim viewbox). */
const VIEWBOX_CARACAS = "-67.15,10.56,-66.72,10.36";

function parseHits(raw: unknown): LugarEncontrado[] {
  if (!Array.isArray(raw)) return [];
  const out: LugarEncontrado[] = [];
  for (const item of raw as NominatimHit[]) {
    const lng = Number(item.lon);
    const lat = Number(item.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const nombre = item.name?.trim() || item.display_name?.split(",")[0]?.trim() || "Lugar";
    const detalle = item.display_name?.trim() ?? "";
    out.push({
      id: `${item.osm_type ?? "n"}/${item.osm_id ?? item.place_id ?? out.length}`,
      nombre,
      detalle,
      lngLat: [lng, lat],
    });
  }
  return out;
}

/**
 * Geocodifica con Nominatim (OSM). 1 req/s: el caller debe debounce.
 * Sesgo Caracas; no estricto (bounded=0) para aeropuerto/litoral.
 */
export async function buscarLugares(
  consulta: string,
  signal?: AbortSignal,
): Promise<LugarEncontrado[]> {
  const q = consulta.trim();
  if (q.length < 2) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "8");
  url.searchParams.set("countrycodes", "ve");
  url.searchParams.set("viewbox", VIEWBOX_CARACAS);
  url.searchParams.set("bounded", "0");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("accept-language", "es");
  const res = await fetch(url.toString(), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return parseHits(await res.json());
}
