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
CACHE_SCRIPT="$ROOT_DIR/deploy/scripts/deploy-cache.py"
DEPLOY_CHANGED=0

cache_check() {
  python3 "$CACHE_SCRIPT" check "$@"
}

cache_mark() {
  python3 "$CACHE_SCRIPT" mark "$@" >/dev/null
}

echo "==> Paso 1/5: comprobacion del entorno"
bash "$ROOT_DIR/deploy/scripts/check-deploy-env.sh"

echo "==> Paso 2/5: generacion del indice de busqueda"
SEARCH_INPUT="$ROOT_DIR/${SEARCH_INDEX_INPUT_PATH:-deploy/input/private-assets/texts}"
SEARCH_OUTPUT="$ROOT_DIR/${SEARCH_INDEX_OUTPUT_PATH:-deploy/input/public-assets/search}"
SEARCH_CACHE_ARGS=(
  --key "search-index"
  --path "$SEARCH_INPUT"
  --path "$ROOT_DIR/scripts/build-search-index.mjs"
  --path "$ROOT_DIR/scripts/validate-search-index.mjs"
  --extra "compact=${SEARCH_INDEX_COMPACT:-true}"
  --require-nonempty-dir "$SEARCH_OUTPUT"
)
if cache_check "${SEARCH_CACHE_ARGS[@]}" >/dev/null; then
  echo "==> Indice de busqueda sin cambios: se reutiliza"
else
  bash "$ROOT_DIR/deploy/scripts/build-search-index.sh"
  cache_mark "${SEARCH_CACHE_ARGS[@]}"
  DEPLOY_CHANGED=1
fi

echo "==> Paso 3/5: generacion del indice de busqueda de resumenes"
SUMMARY_SQLITE="$ROOT_DIR/${SUMMARY_INDEX_SQLITE_PATH:-${SQLITE_LOCAL_PATH:-deploy/input/turso/etso.sqlite}}"
SUMMARY_INPUT="$ROOT_DIR/${SUMMARY_INDEX_INPUT_PATH:-deploy/input/public-assets/resumenes}"
SUMMARY_OUTPUT="$ROOT_DIR/${SUMMARY_INDEX_OUTPUT_PATH:-deploy/input/public-assets/resumenes/search-index.json}"
SUMMARY_CACHE_ARGS=(
  --key "summary-search-index"
  --path "$SUMMARY_SQLITE"
  --path "$SUMMARY_INPUT"
  --path "$ROOT_DIR/scripts/build-summary-search-index.mjs"
  --exclude-name "search-index.json"
  --extra "compact=${SUMMARY_INDEX_COMPACT:-true}"
  --require-file "$SUMMARY_OUTPUT"
)
if cache_check "${SUMMARY_CACHE_ARGS[@]}" >/dev/null; then
  echo "==> Indice de resumenes sin cambios: se reutiliza"
else
  bash "$ROOT_DIR/deploy/scripts/build-summary-search-index.sh"
  cache_mark "${SUMMARY_CACHE_ARGS[@]}"
  DEPLOY_CHANGED=1
fi

echo "==> Paso 4/5: sincronizacion R2"
R2_CACHE_ARGS=(
  --key "r2-sync"
  --path "$ROOT_DIR/deploy/input/public-assets/search"
  --path "$ROOT_DIR/deploy/input/public-assets/resumenes"
  --path "$ROOT_DIR/deploy/input/private-assets/texts"
  --path "$ROOT_DIR/deploy/config/r2-targets.json"
  --path "$ROOT_DIR/deploy/scripts/sync-r2.sh"
)
if cache_check "${R2_CACHE_ARGS[@]}" >/dev/null; then
  echo "==> R2 sin cambios: se omite sincronizacion"
else
  bash "$ROOT_DIR/deploy/scripts/sync-r2.sh"
  if [ "${DRY_RUN:-false}" != "true" ]; then
    cache_mark "${R2_CACHE_ARGS[@]}"
    DEPLOY_CHANGED=1
  fi
fi

echo "==> Paso 5/5: reemplazo Turso"
TURSO_CACHE_ARGS=(
  --key "turso-db"
  --path "$ROOT_DIR/${SQLITE_LOCAL_PATH:-deploy/input/turso/etso.sqlite}"
)
if [ "${DRY_RUN:-false}" = "true" ]; then
  if cache_check "${TURSO_CACHE_ARGS[@]}" >/dev/null; then
    echo "==> SQLite sin cambios: Turso no se reemplazaria"
  else
    echo "==> DRY_RUN=true: no se reemplaza Turso"
  fi
elif cache_check "${TURSO_CACHE_ARGS[@]}" >/dev/null; then
  echo "==> SQLite sin cambios: se omite Turso"
else
  bash "$ROOT_DIR/deploy/scripts/replace-turso-db.sh"
  cache_mark "${TURSO_CACHE_ARGS[@]}"
  DEPLOY_CHANGED=1
fi

if [ "$DEPLOY_CHANGED" -eq 0 ]; then
  echo "==> No hay cambios desplegables; no se lanza deploy hook"
elif [ -n "${DEPLOY_HOOK_URL:-}" ]; then
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
