import { Bike, Car, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function iconoDeCategoria(category?: string): LucideIcon {
  if (category === "person") return User;
  if (category === "scooter" || category === "motorcycle") return Bike;
  return Car;
}

export function IconoCategoriaUnidad({
  category,
  className,
}: {
  category?: string;
  className?: string;
}) {
  const Icono = iconoDeCategoria(category);
  return <Icono className={cn("size-4 shrink-0", className)} aria-hidden />;
}
