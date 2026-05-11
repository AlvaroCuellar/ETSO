#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/deploy/scripts/bootstrap-path.sh"
source "$ROOT_DIR/deploy/scripts/turso-command.sh"
ENV_FILE="${DEPLOY_ENV_FILE:-$ROOT_DIR/deploy/.env.deploy}"
if [ ! -f "$ENV_FILE" ] && [ -f "$ROOT_DIR/.env.deploy" ]; then
  ENV_FILE="$ROOT_DIR/.env.deploy"
fi

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "No existe archivo de entorno de deploy: $ENV_FILE"
  exit 1
fi

missing=0

require_command() {
  if ! command -v "$1" >/dev/null; then
    echo "Falta comando requerido: $1"
    missing=1
  fi
}

require_dir() {
  if [ ! -d "$ROOT_DIR/$1" ]; then
    echo "Falta carpeta requerida: $1"
    missing=1
  fi
}

require_file() {
  if [ ! -f "$ROOT_DIR/$1" ]; then
    echo "Falta archivo requerido: $1"
    missing=1
  fi
}

require_command node
require_command aws
require_command jq
if [ "${DRY_RUN:-false}" != "true" ]; then
  require_command sqlite3
  if TURSO_MODE="$(detect_turso_mode)"; then
    export TURSO_MODE
  else
    echo "Falta Turso CLI: instala turso nativo o turso dentro de WSL"
    missing=1
  fi
  if [ -n "${DEPLOY_HOOK_URL:-}" ]; then
    require_command curl
  fi
fi

: "${R2_ACCOUNT_ID:?Falta R2_ACCOUNT_ID en .env.deploy}"
if [ -z "${R2_ACCESS_KEY_ID:-}" ] && [ -z "${AWS_PROFILE:-}" ]; then
  echo "Falta R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY o AWS_PROFILE en .env.deploy"
  missing=1
fi
if [ -n "${R2_ACCESS_KEY_ID:-}" ] || [ -n "${R2_SECRET_ACCESS_KEY:-}" ]; then
  : "${R2_ACCESS_KEY_ID:?Falta R2_ACCESS_KEY_ID en .env.deploy}"
  : "${R2_SECRET_ACCESS_KEY:?Falta R2_SECRET_ACCESS_KEY en .env.deploy}"
fi

: "${TURSO_DB_NAME:?Falta TURSO_DB_NAME en .env.deploy}"
: "${SQLITE_LOCAL_PATH:?Falta SQLITE_LOCAL_PATH en .env.deploy}"

require_dir "${SEARCH_INDEX_INPUT_PATH:-deploy/input/private-assets/texts}"
require_dir "deploy/input/public-assets/resumenes"
if [ "${DRY_RUN:-false}" != "true" ]; then
  require_file "$SQLITE_LOCAL_PATH"
fi

if [ "$missing" -ne 0 ]; then
  exit 1
fi

echo "==> Entorno de deploy comprobado"
