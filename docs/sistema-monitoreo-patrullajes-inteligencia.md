# Sistema de Monitoreo de Patrullajes e Inteligencia Operativa

**Nombre:** Centinela Ops  
**Repo:** [github.com/diazpolanco13/centinela-ops](https://github.com/diazpolanco13/centinela-ops)  
**Código local:** `/opt/centinela-ops`  
**Estado:** chrome de sala extraído (agosto 2026). Dominio operativo (Traccar, ZIO, misiones, Supabase) pendiente.

Proyecto **independiente** de Campamentos Transitorios. No comparte base de datos, Auth ni usuarios.

---

## Visión General

Sistema orientado a la **gestión operativa de patrullajes** y la **recepción/procesamiento de reportes de inteligencia**, donde el tracking GPS (Traccar) es únicamente una fuente de posición en tiempo real de las unidades, no el producto principal.

No es una aplicación de rastreo de flotas genérica. Es una herramienta de **sala de situación / centro de operaciones** diseñada para:

- Monitorear patrullajes en tiempo real
- Definir y gestionar Zonas de Interés Operativo (ZIO)
- Programar patrullajes por zonas y franjas horarias
- Marcar y administrar Puntos de Interés (POI)
- Recibir, clasificar y georreferenciar reportes de inteligencia
- Evaluar cumplimiento de misiones de patrullaje
- Proporcionar visión situacional integrada

---

## Qué hay hoy (chrome extraído)

SPA extraída de Campamentos: misma piel y motor de mapa, **sin** censo, centros ni Auth de campamentos.

| Pieza | Estado |
|-------|--------|
| Splash + login cinematográfico (fade sobre el mapa) | Listo. Auth **stub** local (`sessionStorage`). Cualquier usuario/clave. **No** conecta a Supabase de campamentos. |
| Mapa MapLibre (Caracas) | Listo. Capas Carto/OSM/híbrido, 3D, globo, intro órbita, HUD MAP/SAT. Unidades **mock**. |
| Menú lateral rail | Listo. Sala (Mapa, Brain), Operaciones (Zonas, POIs, Misiones, Unidades), Inteligencia (Reportes, Alertas). Rutas extra = placeholder. |
| `/brain` grafo radial | Listo. Datos mock de zonas/sectores. Skill `cinematic-brain-graph` en el repo. |
| Design system | shadcn + tokens dark (Geist / teal). |
| Kit agentes | caveman, cavecrew, frontend-orchestrator, supabase skills, rules UI/grafo. |

Arranque:

```bash
cd /opt/centinela-ops
npm i && npm run dev   # puerto 5181
```

---

## Problema que resuelve

Las unidades de seguridad e inteligencia necesitan:

1. Saber en tiempo real dónde están las patrullas y si están cumpliendo las zonas asignadas.
2. Planificar cobertura territorial de forma estructurada (no solo “salir a patrullar”).
3. Registrar y visualizar puntos críticos del terreno.
4. Integrar reportes de inteligencia con el despliegue operativo actual.
5. Tener una visión única (mapa + paneles) que combine posición, misión, zona y reporte.

Traccar resuelve solo la recepción de coordenadas. Este sistema resuelve la **capa operativa y de inteligencia**.

---

## Componentes Principales

### 1. Monitoreo de Patrullajes en Tiempo Real
- Visualización de unidades (vehículos / personal) sobre mapa.
- Estado de cada unidad: en ruta, dentro de zona asignada, detenida, fuera de zona, sin señal.
- Historial de recorrido por misión o por período.
- Vinculación unidad ↔ dispositivo Traccar (`deviceId`).

Hoy: 3 marcadores mock. Falta Traccar + GeoJSON layers (no HTML markers para GPS 1 Hz).

### 2. Zonas de Interés Operativo (ZIO)
- Polígonos geográficos dibujados en el mapa.
- Metadatos: nombre, prioridad, tipo de amenaza / interés, frecuencia deseada de patrullaje, responsable, observaciones.
- Uso como base para programación de misiones y evaluación de cumplimiento.

Hoy: ítem de menú. Falta `maplibre-gl-draw` (no existía en campamentos).

### 3. Puntos de Interés (POI)
- Ubicaciones puntuales relevantes (infraestructura, puntos de venta, casas de interés, posibles rutas de fuga, etc.).
- Atributos: tipo, nivel de riesgo, descripción, archivos adjuntos, historial de eventos asociados.
- Vinculables a reportes de inteligencia y a zonas.

### 4. Programación de Patrullajes (Misiones)
- Creación de misiones con zona(s), unidad(es), ventana horaria, objetivo, prioridad.
- Estados: Programada → En ejecución → Cumplida / Incumplida / Cancelada / Parcial.
- Cálculo automático de cumplimiento (posiciones reales vs. zona y horario).

### 5. Recepción y Gestión de Reportes de Inteligencia
- Canales: formulario web, Telegram, carga manual.
- Flujo: Recibido → En análisis → Validado / Descartado → Archivado.
- Vinculación con POIs, Zonas y misiones.

### 6. Visión Situacional (Sala de Situación)
- Panel: unidades activas, misiones en curso, reportes críticos, zonas sin cobertura.
- Alertas: salida de zona, no ingreso en horario, reporte crítico, detención excesiva.

---

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND (Sala de Situación)                │
│   Vite 7 + React 19 + React Router 7 + MapLibre + Tailwind 4│
│  • Mapa operativo multi-capa (listo)                        │
│  • HUD capas / 3D / globo (listo)                           │
│  • /brain grafo de mando (mock)                             │
│  • Gestión Zonas / POIs / Reportes / Misiones (pendiente)   │
└───────────────────────┬─────────────────────┬───────────────┘
                        │                     │
              API / Realtime (pendiente)      │
                        │                     │
┌───────────────────────▼──────────┐   ┌──────▼──────────────┐
│     Backend + Base de Datos      │   │  Traccar            │
│     Supabase NUEVO (no camp.)    │   │  (solo posición)    │
│                                  │   │                     │
│  • Unidades                      │   │  • Recepción GPS    │
│  • Zonas de Interés Operativo    │   │  • tc_positions     │
│  • Puntos de Interés             │   │  • WebSocket        │
│  • Misiones / Patrullajes        │   └─────────────────────┘
│  • Reportes de Inteligencia      │
│  • Cumplimiento                  │
│  • Usuarios y roles              │
│  • Alertas y eventos             │
└──────────────────────────────────┘
```

**Principio clave:** Traccar = sensor de posición. La lógica de negocio vive en el sistema propio.

**Por qué Vite y no Next.js:** la sala es SPA autenticada (mapa + WebSocket). Campamentos ya era Vite; extraer 1:1 da reactividad y el mismo login/mapa. Next.js no aporta velocidad aquí. Landing pública, si hace falta, es otro sitio.

---

## Modelo de Datos Conceptual

| Entidad | Descripción breve | Relación con Traccar |
|---------|-------------------|----------------------|
| **Unidad** | Vehículo o personal que ejecuta patrullajes | `deviceId` (opcional) |
| **Zona de Interés Operativo** | Polígono prioritario de cobertura | Ninguna directa |
| **Punto de Interés** | Ubicación puntual de valor operativo / inteligencia | Ninguna directa |
| **Misión / Patrullaje** | Asignación de unidad(es) a zona(s) en ventana horaria | Se evalúa con posiciones |
| **Reporte de Inteligencia** | Información recibida, clasificada y georreferenciada | Puede vincularse a posición |
| **Evento / Alerta** | Hechos generados por el sistema (cumplimiento, etc.) | Derivado de posiciones |

Relaciones: Misión ↔ Zonas + Unidades. Unidad ↔ device Traccar. Reporte ↔ POI / Zona / Misión. Cumplimiento = posiciones ∩ geometría ∩ ventana horaria.

---

## Flujo de una Misión de Patrullaje (ejemplo)

1. El supervisor crea una **Misión** (zona, unidad, horario, instrucciones).
2. A la hora de inicio: estado **En ejecución**.
3. Posiciones en vivo (WebSocket Traccar o LISTEN/NOTIFY).
4. ¿Entró a la zona en horario? ¿Tiempo mínimo? ¿Salió sin justificación?
5. Cierre: Cumplida / Parcial / Incumplida.
6. Histórico para análisis.

---

## Integración con Traccar

**Se usa:** posición actual, historial, WebSocket `/api/socket` o LISTEN/NOTIFY sobre `tc_positions`.

**No se usa:** geofences de Traccar, su UI, sus usuarios.

**Sincronización:**

1. Corto plazo: frontend al WebSocket de Traccar.
2. Mediano plazo: servicio que escribe estado de Unidad en Supabase (cumplimiento + alertas).

---

## Stack (decidido)

| Capa | Tecnología | Notas |
|------|------------|--------|
| Frontend | Vite 7 + React 19 + React Router 7 | Puerto dev **5181** |
| UI | Tailwind 4 + shadcn (radix-nova) | Extraído de campamentos |
| Mapas | MapLibre GL JS 5 | `src/map/` + `MapaOperativo.tsx` |
| Grafo mando | SVG + d3-force | `/brain` |
| Auth hoy | Stub `authStub.ts` | Sin backend |
| Auth objetivo | Supabase Auth **proyecto nuevo** | Roles: Analista, Supervisor, Jefe de Sala |
| DB objetivo | Supabase Postgres nuevo | No reusar schema/RLS de campamentos |
| GPS | Traccar | Pendiente |
| Deploy | Dokploy, receta SPA Vite | Independiente de campamentos |

Opcional: `VITE_MAPTILER_KEY` para bases HD. Sin clave: Carto / OSM / híbrido Esri.

---

## Fases

### Fase 0 – Chrome (hecho)

- Repo GitHub, scaffold Vite, login+splash, mapa+capas, sidebar, `/brain` mock, kit de agentes.

### Fase 1 – Núcleo Operativo (siguiente)

- Proyecto Supabase nuevo + `perfiles` + roles.
- Cliente Traccar; unidades en vivo (GeoJSON source + symbol/circle, no HTML markers).
- Draw ZIO (polígonos).
- CRUD POI.
- Misión mínima (zona + unidad + horario) + dentro/fuera de zona.

### Fase 2 – Inteligencia

- Formulario + canal Telegram de reportes.
- Estados y georreferencia. Vínculo reporte ↔ zona / POI / misión.

### Fase 3 – Sala y alertas

- Panel de situación. Motor de alertas. Histórico de cobertura.
- HUD denso (capas, filtros).

### Fase 4 – Extensiones

- Hermes (clasificación de reportes). Roles multi-institución. Exportes. Heatmaps.

---

## Principios de Diseño

1. **Traccar es sensor, no cerebro.**
2. **Mapa como interfaz principal.**
3. **Posición ≠ Misión ≠ Zona ≠ Reporte.**
4. **Trazabilidad** de estados.
5. **Sala de operaciones:** capas y filtros, no dashboards genéricos.
6. **Extensible a inteligencia** (Hermes / agentes).
7. **Aislado de campamentos:** ni Auth ni Postgres compartidos.

---

## Próximos pasos

1. Crear proyecto Supabase de Centinela Ops (Auth + tablas Unidad / ZIO / POI / Misión / Reporte / Evento). RLS desde día 1.
2. Reemplazar `authStub` por Auth real.
3. Ingest Traccar → estado de Unidad.
4. Draw de una ZIO + evaluación dentro/fuera.
5. Levantar en Dokploy cuando el MVP de Fase 1 cierre.

---

*Actualizado agosto 2026 — chrome en [centinela-ops](https://github.com/diazpolanco13/centinela-ops)*  
*Concepto original: Sistema de Monitoreo de Patrullajes e Inteligencia Operativa*
