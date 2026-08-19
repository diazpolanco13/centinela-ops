import { useMemo, useState } from "react";
import { buildSalaBrainGraph, type SebinBrainNode } from "@/domain/sebinBrainGraph";
import { SebinBrainGraph } from "./SebinBrainGraph";
import { TotalesBrain } from "./TotalesBrain";

export function BrainView() {
  const graph = useMemo(() => buildSalaBrainGraph(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusUnidadId, setFocusUnidadId] = useState<string | null>(null);

  function onSelect(node: SebinBrainNode | null) {
    setSelectedId(node?.id ?? null);
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-background">
      <SebinBrainGraph
        graph={graph}
        selectedId={selectedId}
        onSelect={onSelect}
        focusUnidadId={focusUnidadId}
        onFocusUnidadIdChange={setFocusUnidadId}
        className="absolute inset-0"
      />
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex md:inset-x-auto md:bottom-auto md:left-14 md:right-14 md:top-3">
        <TotalesBrain resumen={graph.resumen} />
      </div>
    </div>
  );
}
