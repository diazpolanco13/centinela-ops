import { Outlet } from "react-router-dom";
import type { Sesion } from "@/data/authStub";
import { PathnameNavegacionProvider } from "@/contexts/PathnameNavegacionContext";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { Sidebar, SidebarInset, SidebarProvider, SidebarRail } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({ sesion }: { sesion: Sesion }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <PathnameNavegacionProvider>
        <TooltipProvider delayDuration={200}>
          <div className="flex h-[100dvh] w-full overflow-hidden">
            <Sidebar collapsible="icon" variant="sidebar">
              <AppSidebar sesion={sesion} />
              <SidebarRail />
            </Sidebar>
            <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <TopBar sesion={sesion} />
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <Outlet context={{ sesion }} />
              </div>
            </SidebarInset>
          </div>
        </TooltipProvider>
      </PathnameNavegacionProvider>
    </SidebarProvider>
  );
}
