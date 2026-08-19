import { MapaOperativo } from "@/features/mapa/MapaOperativo";

export function MapaView() {
  return (
    <div className="relative h-full min-h-0 w-full">
      <MapaOperativo />
    </div>
  );
}
