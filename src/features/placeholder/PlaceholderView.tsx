export function PlaceholderView({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-lg font-semibold">{titulo}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{detalle}</p>
    </div>
  );
}
