#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${DEPLOY_ENV_FILE:-$ROOT_DIR/deploy/.env.deploy}"
if [ ! -f "$ENV_FILE" ] && [ -f "$ROOT_DIR/.env.deploy" ]; then
  ENV_FILE="$ROOT_DIR/.env.deploy"
fi

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

echo "==> Iniciando despliegue completo"

echo "==> Paso 1/4: comprobación del entorno"
bash "$ROOT_DIR/deploy/scripts/check-deploy-env.sh"

echo "==> Paso 2/4: generación del índice de búsqueda"
bash "$ROOT_DIR/deploy/scripts/build-search-index.sh"

echo "==> Paso 3/4: sincronización R2"
bash "$ROOT_DIR/deploy/scripts/sync-r2.sh"

echo "==> Paso 4/4: reemplazo Turso"
if [ "${DRY_RUN:-false}" = "true" ]; then
  echo "==> DRY_RUN=true: no se reemplaza Turso"
else
  bash "$ROOT_DIR/deploy/scripts/replace-turso-db.sh"
fi

if [ -n "${DEPLOY_HOOK_URL:-}" ]; then
  if [ "${DRY_RUN:-false}" = "true" ]; then
    echo "==> DRY_RUN=true: no se lanza deploy hook"
  else
    echo "==> Lanzando deploy hook"
    curl -fsS -X POST "$DEPLOY_HOOK_URL" >/dev/null
    echo "==> Deploy hook ejecutado"
  fi
fi

echo "==> Despliegue completo terminado"
