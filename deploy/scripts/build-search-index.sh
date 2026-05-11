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

SEARCH_INDEX_INPUT_PATH="${SEARCH_INDEX_INPUT_PATH:-deploy/input/private-assets/texts}"
SEARCH_INDEX_OUTPUT_PATH="${SEARCH_INDEX_OUTPUT_PATH:-deploy/input/public-assets/search}"
SEARCH_INDEX_COMPACT="${SEARCH_INDEX_COMPACT:-true}"
SEARCH_INDEX_NODE_MAX_OLD_SPACE_SIZE="${SEARCH_INDEX_NODE_MAX_OLD_SPACE_SIZE:-8192}"

INPUT_DIR="$ROOT_DIR/$SEARCH_INDEX_INPUT_PATH"
OUTPUT_DIR="$ROOT_DIR/$SEARCH_INDEX_OUTPUT_PATH"

command -v node >/dev/null || { echo "Falta node"; exit 1; }

if [ ! -d "$INPUT_DIR" ]; then
  echo "No existe la carpeta de TXT para generar el índice: $INPUT_DIR"
  exit 1
fi

if [ -z "$(find "$INPUT_DIR" -maxdepth 1 -type f -name '*.txt' -print -quit)" ]; then
  echo "No hay archivos .txt en la carpeta de entrada del índice: $INPUT_DIR"
  exit 1
fi

echo "==> Generando índice de búsqueda"
echo "   - entrada: $SEARCH_INDEX_INPUT_PATH"
echo "   - salida:  $SEARCH_INDEX_OUTPUT_PATH"

ARGS=(
  "$ROOT_DIR/scripts/build-search-index.mjs"
  --input "$INPUT_DIR"
  --output "$OUTPUT_DIR"
)

if [ "$SEARCH_INDEX_COMPACT" = "true" ]; then
  ARGS+=(--compact)
fi

node --max-old-space-size="$SEARCH_INDEX_NODE_MAX_OLD_SPACE_SIZE" "${ARGS[@]}"
node "$ROOT_DIR/scripts/validate-search-index.mjs" --index-dir "$OUTPUT_DIR"

echo "==> Índice de búsqueda preparado"
