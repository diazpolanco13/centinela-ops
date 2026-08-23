import { Skeleton } from "@/components/ui/skeleton";

export function MapaSectionSkeleton() {
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#0c0f12]" aria-busy>
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute left-3 top-3 z-20 h-20 w-10 animate-pulse rounded-xl border border-border/60 bg-card/90" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Skeleton className="size-48 rounded-full" />
      </div>
    </div>
  );
}
