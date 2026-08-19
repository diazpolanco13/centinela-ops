# Architecture Memory — Centinela Ops

SPA Vite 7 + React 19 + React Router 7 + Tailwind 4 + shadcn + MapLibre.

- Login stub (`src/data/authStub.ts`)
- Mapa: `src/features/mapa/MapaOperativo.tsx` + `src/map/`
- Brain: `src/features/brain/` + `src/domain/sebinBrain*.ts`
- Shell: `src/layouts/AppShell.tsx`, `src/components/AppSidebar.tsx`

Traccar: proxy Vite `/api` → `:8082`, `usePosicionesTraccar` + capa GeoJSON `src/map/capaUnidades.ts`.

Pendiente: Supabase, ZIO draw.
