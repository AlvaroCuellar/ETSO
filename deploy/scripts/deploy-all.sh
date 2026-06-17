#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${DEPLOY_ENV_FILE:-$ROOT_DIR/deploy/.env.deploy}"
EXTERNAL_REQUIRE_DEPLOY_HOOK="${REQUIRE_DEPLOY_HOOK:-}"
if [ ! -f "$ENV_FILE" ] && [ -f "$ROOT_DIR/.env.deploy" ]; then
  ENV_FILE="$ROOT_DIR/.env.deploy"
fi

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
  if [ -n "$EXTERNAL_REQUIRE_DEPLOY_HOOK" ]; then
    REQUIRE_DEPLOY_HOOK="$EXTERNAL_REQUIRE_DEPLOY_HOOK"
  fi
fi

echo "==> Iniciando despliegue completo"

echo "==> Paso 1/5: comprobacion del entorno"
bash "$ROOT_DIR/deploy/scripts/check-deploy-env.sh"

echo "==> Paso 2/5: generacion del indice de busqueda"
bash "$ROOT_DIR/deploy/scripts/build-search-index.sh"

echo "==> Paso 3/5: generacion del indice de busqueda de resumenes"
bash "$ROOT_DIR/deploy/scripts/build-summary-search-index.sh"

echo "==> Paso 4/5: sincronizacion R2"
bash "$ROOT_DIR/deploy/scripts/sync-r2.sh"

echo "==> Paso 5/5: reemplazo Turso"
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
elif [ "${DRY_RUN:-false}" != "true" ]; then
  if [ "${REQUIRE_DEPLOY_HOOK:-true}" = "true" ]; then
    echo "==> Falta DEPLOY_HOOK_URL; Vercel no se ha redeployado"
    echo "==> Configura DEPLOY_HOOK_URL o ejecuta con REQUIRE_DEPLOY_HOOK=false si haras el redeploy manualmente"
    exit 1
  fi
  echo "==> DEPLOY_HOOK_URL no configurado; Vercel requiere redeploy manual"
fi

echo "==> Despliegue completo terminado"
