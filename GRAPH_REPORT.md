# GRAPH_REPORT

Grafo aún no construido en este repo.

Tras `code-review-graph` build, este archivo se regenera.

Guía original (campamentos) resumida:

# GRAPH_REPORT — Grafo de código del proyecto

> **Para cualquier IA (Cursor, Claude Code, Codex, etc.) que abra este repo:**
> este proyecto tiene un grafo de conocimiento del código construido con
> **code-review-graph v2.3.6** (Tree-sitter → SQLite local, sin nube).
> **Consúltalo ANTES de hacer grep o leer archivos a ciegas** — una consulta
> al grafo cuesta ~300–2.500 tokens; escanear el código cuesta >150.000.

## Estado del grafo (13-jul-2026, build inicial)

| Métrica | Valor |
|---|---|
| Archivos indexados | 462 |
| Nodos (funciones, clases, imports) | ~2.700 |
| Aristas (llamadas, herencia, tests) | ~25.700 |
| Lenguajes | typescript, tsx, javascript, python, sql, bash |
| Build inicial | 16 s · commit `ef29f96` (main) |
| BD | `.code-review-graph/` (SQLite, **gitignored**, loca
