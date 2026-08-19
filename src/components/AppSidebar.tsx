import { Link } from "react-router-dom";
import {
  AlertTriangle,
  FileText,
  Flag,
  MapPinned,
  Network,
  Radio,
  Shield,
  Target,
} from "lucide-react";
import type { Sesion } from "@/data/authStub";
import { usePathnameNavegacion } from "@/contexts/PathnameNavegacionContext";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

type IconoMenu = typeof Shield;

function rutaActiva(pathname: string, ruta: string): boolean {
  if (ruta === "/") return pathname === "/" || pathname === "/mapa";
  return pathname === ruta || pathname.startsWith(`${ruta}/`);
}

function TextoMenu({ children }: { children: string }) {
  return <span className="group-data-[collapsible=icon]:hidden">{children}</span>;
}

function ItemMenu({
  to,
  icono: Icono,
  label,
  activo,
}: {
  to: string;
  icono: IconoMenu;
  label: string;
  activo: boolean;
}) {
  const { marcarNavegacion } = usePathnameNavegacion();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={activo} tooltip={label}>
        <Link to={to} onClick={() => marcarNavegacion(to)}>
          <Icono />
          <TextoMenu>{label}</TextoMenu>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ sesion }: { sesion: Sesion }) {
  const { pathname } = usePathnameNavegacion();
  void sesion;

  return (
    <>
      <SidebarHeader className="gap-0 p-2">
        <div className="flex items-center gap-2 px-1 py-1">
          <Shield className="size-5 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold tracking-wide group-data-[collapsible=icon]:hidden">
            Centinela Ops
          </span>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sala</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <ItemMenu to="/" icono={MapPinned} label="Mapa" activo={rutaActiva(pathname, "/")} />
              <ItemMenu to="/brain" icono={Network} label="Brain" activo={rutaActiva(pathname, "/brain")} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Operaciones</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <ItemMenu to="/zonas" icono={Target} label="Zonas" activo={rutaActiva(pathname, "/zonas")} />
              <ItemMenu to="/pois" icono={Flag} label="POIs" activo={rutaActiva(pathname, "/pois")} />
              <ItemMenu to="/misiones" icono={Radio} label="Misiones" activo={rutaActiva(pathname, "/misiones")} />
              <ItemMenu to="/unidades" icono={Shield} label="Unidades" activo={rutaActiva(pathname, "/unidades")} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Inteligencia</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <ItemMenu to="/reportes" icono={FileText} label="Reportes" activo={rutaActiva(pathname, "/reportes")} />
              <ItemMenu to="/alertas" icono={AlertTriangle} label="Alertas" activo={rutaActiva(pathname, "/alertas")} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 group-data-[collapsible=icon]:hidden">
        <p className="px-1 text-[10px] leading-snug text-muted-foreground">
          Chrome extraído. Traccar y Supabase se cablean al desplegar.
        </p>
      </SidebarFooter>
    </>
  );
}
