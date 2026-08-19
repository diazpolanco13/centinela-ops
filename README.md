# Centinela Ops

Sala de situación (patrullajes e inteligencia). Chrome extraído de Campamentos Transitorios: login cinematográfico, mapa MapLibre (capas / 3D / globo / intro órbita), menú lateral, grafo `/brain`.

## Arranque

```bash
npm i
npm run dev
```

Abre `http://localhost:5181`. Login **stub**: cualquier usuario y contraseña.

## Qué hay

- Splash + login con fade sobre el mapa
- Mapa Caracas: bases Carto/OSM/híbrido, 3D, globo, unidades mock
- Sidebar: Mapa, Brain, Zonas, POIs, Misiones, Unidades, Reportes, Alertas
- `/brain`: grafo radial (datos mock de zonas)

## Qué falta (al desplegar)

- Supabase Auth + roles reales
- Traccar (posición en vivo)
- Dibujo de Zonas de Interés Operativo
- Misiones, reportes, alertas

Opcional: `VITE_MAPTILER_KEY` para satélite HD.

Concepto y fases: [docs/sistema-monitoreo-patrullajes-inteligencia.md](docs/sistema-monitoreo-patrullajes-inteligencia.md).

## Skills Cursor

`.agents/skills/`: `/caveman`, `/cinematic-brain-graph`, `frontend-orchestrator`, `cavecrew`, `supabase`.
