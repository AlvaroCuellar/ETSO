#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/deploy/scripts/bootstrap-path.sh"
ENV_FILE="${DEPLOY_ENV_FILE:-$ROOT_DIR/deploy/.env.deploy}"
if [ ! -f "$ENV_FILE" ] && [ -f "$ROOT_DIR/.env.deploy" ]; then
  ENV_FILE="$ROOT_DIR/.env.deploy"
fi

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

SUMMARY_INDEX_SQLITE_PATH="${SUMMARY_INDEX_SQLITE_PATH:-${SQLITE_LOCAL_PATH:-deploy/input/turso/etso.sqlite}}"
SUMMARY_INDEX_INPUT_PATH="${SUMMARY_INDEX_INPUT_PATH:-deploy/input/public-assets/resumenes}"
SUMMARY_INDEX_OUTPUT_PATH="${SUMMARY_INDEX_OUTPUT_PATH:-deploy/input/public-assets/resumenes/search-index.json}"
SUMMARY_INDEX_COMPACT="${SUMMARY_INDEX_COMPACT:-true}"

SQLITE_FILE="$ROOT_DIR/$SUMMARY_INDEX_SQLITE_PATH"
INPUT_DIR="$ROOT_DIR/$SUMMARY_INDEX_INPUT_PATH"
OUTPUT_FILE="$ROOT_DIR/$SUMMARY_INDEX_OUTPUT_PATH"

command -v node >/dev/null || { echo "Falta node"; exit 1; }

if [ ! -f "$SQLITE_FILE" ]; then
  echo "No existe el SQLite para generar el indice de resumenes: $SQLITE_FILE"
  exit 1
fi

if [ ! -d "$INPUT_DIR" ]; then
  echo "No existe la carpeta de resumenes para generar el indice: $INPUT_DIR"
  exit 1
fi

if [ -z "$(find "$INPUT_DIR" -maxdepth 1 -type f -name '*.json' ! -name 'search-index.json' -print -quit)" ]; then
  echo "No hay archivos .json de resumenes en: $INPUT_DIR"
  exit 1
fi

echo "==> Generando indice de busqueda de resumenes"
echo "   - sqlite:  $SUMMARY_INDEX_SQLITE_PATH"
echo "   - entrada: $SUMMARY_INDEX_INPUT_PATH"
echo "   - salida:  $SUMMARY_INDEX_OUTPUT_PATH"

ARGS=(
  "$ROOT_DIR/scripts/build-summary-search-index.mjs"
  --sqlite "$SQLITE_FILE"
  --input "$INPUT_DIR"
  --output "$OUTPUT_FILE"
)

if [ "$SUMMARY_INDEX_COMPACT" = "true" ]; then
  ARGS+=(--compact)
else
  ARGS+=(--pretty)
fi

node "${ARGS[@]}"

echo "==> Indice de busqueda de resumenes preparado"
