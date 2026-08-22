# Centinela Ops

Sala de situación (patrullajes e inteligencia). Chrome extraído de Campamentos Transitorios: login cinematográfico, mapa MapLibre (capas / 3D / globo / intro órbita), menú lateral, grafo `/brain`.

## Arranque

```bash
npm i
PORT=5281 npm run dev
# o reinicio limpio (mata 5281, borra caches Vite, arranca):
npm run reiniciar
```

Puerto **5181** lo ocupa `traccar-dev` (protocolos GPS). Abre `http://localhost:5281`. Login **stub**: cualquier usuario y contraseña.

`scripts/reiniciar.sh --hard` reinstala dependencias. `--solo-limpiar` no arranca. No toca Traccar.

## Traccar (posiciones en vivo)

Vite proxea `/api` → Traccar prod `http://127.0.0.1:8082` (REST + WebSocket).

1. En Traccar (`http://127.0.0.1:8082`) crear token de usuario que vea la flota (Settings → Account → Token).
2. Copiar [`.env.example`](.env.example) a `.env.local` y pegar el token en `VITE_TRACCAR_TOKEN`.
3. Reiniciar Vite.

Sin token: 3 unidades mock, sin aviso. Token inválido o 401: mock + aviso.

## Qué hay

- Splash + login con fade sobre el mapa
- Mapa Caracas: bases Carto/OSM/híbrido, 3D, globo, unidades Traccar (GeoJSON) o mock
- Sidebar: Mapa, Brain, Zonas, POIs, Misiones, Unidades, Reportes, Alertas
- `/brain`: grafo radial (datos mock de zonas)

## Qué falta (al desplegar)

- Supabase Auth + roles reales
- Dibujo de Zonas de Interés Operativo
- Misiones, reportes, alertas

Opcional: `VITE_MAPTILER_KEY` para satélite HD.

Icono de unidad en mapa: [top view car](https://thenounproject.com/icon/5105418/) by Stone from [Noun Project](https://thenounproject.com/) (CC BY). Modelos 3D: [Generic passenger car pack](https://sketchfab.com/3d-models/generic-passenger-car-pack-20f9af9b8a404d5cb022ac6fe87f21f5) by Comrade1280 (CC BY).

Concepto y fases: [docs/sistema-monitoreo-patrullajes-inteligencia.md](docs/sistema-monitoreo-patrullajes-inteligencia.md).

## Skills Cursor

`.agents/skills/`: `/caveman`, `/cinematic-brain-graph`, `frontend-orchestrator`, `cavecrew`, `supabase`.
