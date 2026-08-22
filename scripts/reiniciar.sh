#!/usr/bin/env bash
# Reinicio limpio de Vite. No toca Traccar (8082 / 8083 / 5181 GPS).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-5281}"
HARD=0
SOLO_LIMPIAR=0

uso() {
  cat <<EOF
uso: scripts/reiniciar.sh [--hard] [--solo-limpiar] [--port=5281]

  mata el proceso en PORT (default 5281), borra caches Vite y arranca
  PORT=5281 npm run dev.

  --hard          también borra node_modules y corre npm ci
  --solo-limpiar  mata + caches; no arranca
  --port=N        puerto HTTP (nunca 5181: GPS de traccar-dev)

  http://localhost:${PORT}/
EOF
}

for arg in "$@"; do
  case "$arg" in
    --hard) HARD=1 ;;
    --solo-limpiar) SOLO_LIMPIAR=1 ;;
    --port=*) PORT="${arg#--port=}" ;;
    -h|--help)
      uso
      exit 0
      ;;
    *)
      echo "flag desconocido: $arg" >&2
      uso >&2
      exit 1
      ;;
  esac
done

if [[ "$PORT" == "5181" ]]; then
  echo "5181 es GPS de traccar-dev, no HTTP. Usa 5281." >&2
  exit 1
fi

cd "$ROOT"

pids_en_puerto() {
  ss -lptn "sport = :${PORT}" 2>/dev/null | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | sort -u
}

echo "→ puerto ${PORT}"
PIDS="$(pids_en_puerto)"
if [[ -n "${PIDS}" ]]; then
  echo "  mata ${PIDS//$'\n'/ }"
  # word split intencional: lista de pids
  # shellcheck disable=SC2086
  kill ${PIDS} 2>/dev/null || true
  sleep 0.25
  PIDS="$(pids_en_puerto)"
  if [[ -n "${PIDS}" ]]; then
    # shellcheck disable=SC2086
    kill -9 ${PIDS} 2>/dev/null || true
  fi
fi

# Vite de este repo aunque el pid no salga en ss (sin root).
if command -v pgrep >/dev/null 2>&1; then
  extra="$(pgrep -f "${ROOT}/node_modules/.bin/vite|${ROOT}/node_modules/vite/bin/vite.js" || true)"
  if [[ -n "${extra}" ]]; then
    echo "  mata vite repo ${extra//$'\n'/ }"
    # shellcheck disable=SC2086
    kill ${extra} 2>/dev/null || true
  fi
fi

for i in $(seq 1 40); do
  if [[ -z "$(pids_en_puerto)" ]]; then
    break
  fi
  if [[ "$i" -eq 40 ]]; then
    echo "puerto ${PORT} sigue ocupado" >&2
    exit 1
  fi
  sleep 0.1
done

echo "→ caches"
rm -rf "${ROOT}/node_modules/.vite" "${ROOT}/dist" "${ROOT}/dev-dist"

if [[ "$HARD" -eq 1 ]]; then
  echo "→ node_modules + npm ci"
  rm -rf "${ROOT}/node_modules"
  npm ci
elif [[ ! -d "${ROOT}/node_modules" ]]; then
  echo "→ npm ci (no hay node_modules)"
  npm ci
fi

if [[ "$SOLO_LIMPIAR" -eq 1 ]]; then
  echo "listo (sin arrancar)"
  exit 0
fi

echo "→ Vite  http://localhost:${PORT}/"
exec env PORT="${PORT}" npm run dev
