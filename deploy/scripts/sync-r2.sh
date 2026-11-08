#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
source "$ROOT_DIR/deploy/scripts/bootstrap-path.sh"
ENV_FILE="${DEPLOY_ENV_FILE:-$ROOT_DIR/deploy/.env.deploy}"
if [ ! -f "$ENV_FILE" ] && [ -f "$ROOT_DIR/.env.deploy" ]; then
  ENV_FILE="$ROOT_DIR/.env.deploy"
fi
CONFIG_FILE="$ROOT_DIR/deploy/config/r2-targets.json"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

DRY_RUN="${DRY_RUN:-false}"
PHASE="${1:-all}"
case "$PHASE" in
  all|stage|stage-index|activate) ;;
  *) echo "Uso: sync-r2.sh [all|stage|stage-index|activate [version]]" >&2; exit 1 ;;
esac
ACTIVATION_VERSION="${2:-}"
if [ "$#" -gt 2 ] || { [ "$#" -eq 2 ] && { [ "$PHASE" != "activate" ] || [ -z "$ACTIVATION_VERSION" ]; }; }; then
  echo "Solo activate admite una versión explícita." >&2
  exit 1
fi

PRIVATE_TEXT_BUCKET="etso-textos"
PRIVATE_TEXT_INDEX_PREFIX="texoro-search"
PRIVATE_INDEX_BUCKET="${R2_TEXORO_INDEX_BUCKET:-$PRIVATE_TEXT_BUCKET}"
PRIVATE_INDEX_DIR="deploy/input/private-assets/search"
if [ "$PRIVATE_INDEX_BUCKET" = "$PRIVATE_TEXT_BUCKET" ]; then
  PRIVATE_INDEX_PREFIX="$PRIVATE_TEXT_INDEX_PREFIX"
elif [ "$PRIVATE_INDEX_BUCKET" = "etso-search-private" ]; then
  PRIVATE_INDEX_PREFIX="search"
else
  echo "El índice TEXORO solo puede publicarse en un bucket privado autorizado." >&2
  exit 1
fi
FREQUENCY_INDEX_BUCKET="etso-public-assets"
FREQUENCY_INDEX_DIR="deploy/input/public-assets/search-frequencies"
FREQUENCY_INDEX_PREFIX="search-frequencies"
if [ "${R2_TEXORO_INDEX_PREFIX:-$PRIVATE_INDEX_PREFIX}" != "$PRIVATE_INDEX_PREFIX" ]; then
  echo "El índice TEXORO solo puede publicarse en el destino privado configurado." >&2
  exit 1
fi

command -v jq >/dev/null || { echo "Falta jq"; exit 1; }

if [ ! -f "$CONFIG_FILE" ]; then
  echo "No existe el archivo de configuración: $CONFIG_FILE" >&2
  exit 1
fi

# Valida la tabla completa antes de iniciar operaciones y conserva esa misma copia.
# Las frecuencias se generan en un temporal aislado y nunca se sincronizan desde el índice completo.
if ! TARGETS="$(jq -ce --arg indexBucket "$PRIVATE_INDEX_BUCKET" --arg indexDir "$PRIVATE_INDEX_DIR" --arg indexPrefix "$PRIVATE_INDEX_PREFIX" \
  --arg frequencyBucket "$FREQUENCY_INDEX_BUCKET" --arg frequencyDir "$FREQUENCY_INDEX_DIR" --arg frequencyPrefix "$FREQUENCY_INDEX_PREFIX" '
  if type == "array" and (map(.name) | sort) == ["frecuencias", "resumenes", "search", "textos"] and all(.[];
    (.name == "search" and .local == $indexDir and .bucket == $indexBucket and .prefix == $indexPrefix and .delete == false) or
    (.name == "frecuencias" and .local == $frequencyDir and .bucket == $frequencyBucket and .prefix == $frequencyPrefix and .delete == false) or
    (.name == "resumenes" and .local == "deploy/input/public-assets/resumenes" and .bucket == "etso-public-assets" and .prefix == "resumenes" and .delete == true) or
    (.name == "textos" and .local == "deploy/input/private-assets/texts" and .bucket == "etso-textos" and .prefix == "" and .delete == true)
  ) then .[] else error("Destinos R2 no autorizados") end
' "$CONFIG_FILE")"; then
  echo "Configuración de destinos R2 rechazada antes de publicar." >&2
  exit 1
fi

require_local_dir() {
  local path="$ROOT_DIR/$1"
  if [ ! -d "$path" ] || [ "$(cd "$path" && pwd -P)" != "$path" ]; then
    echo "Carpeta R2 ausente o enlazada: $path" >&2
    exit 1
  fi
}

INDEX_DIR="$ROOT_DIR/$PRIVATE_INDEX_DIR"
INDEX_MANIFEST="$INDEX_DIR/manifest.json"
if [ -n "$ACTIVATION_VERSION" ]; then
  if [[ ! "$ACTIVATION_VERSION" =~ ^v[0-9]+-[a-zA-Z0-9-]+$ ]]; then
    echo "Versión de TEXORO no válida." >&2
    exit 1
  fi
  INDEX_VERSION="$ACTIVATION_VERSION"
else
  require_local_dir "$PRIVATE_INDEX_DIR"
  if [ ! -f "$INDEX_MANIFEST" ] || [ -L "$INDEX_MANIFEST" ] ||
     ! INDEX_VERSION="$(jq -er '.indexVersion | strings | select(test("^v[0-9]+-[a-zA-Z0-9-]+$"))' "$INDEX_MANIFEST")"; then
    echo "Manifiesto privado de TEXORO ausente o inválido." >&2
    exit 1
  fi
fi

if [ "$PHASE" = "all" ] || [ "$PHASE" = "stage" ]; then
  require_local_dir "deploy/input/public-assets/resumenes"
  require_local_dir "deploy/input/private-assets/texts"
fi

if [ "$PHASE" != "activate" ]; then
  if [ -n "$(find "$INDEX_DIR" -type l -print -quit)" ] ||
     ! INDEX_FILES="$(jq -er '[.files[], .shards[][] .file] | unique | .[] |
       if type == "string" and test("^[a-zA-Z0-9_-]+(/[a-zA-Z0-9_-]+)*\\.json$") then .
       else error("Ruta inválida en el manifiesto TEXORO") end' "$INDEX_MANIFEST")"; then
    echo "El índice privado TEXORO contiene referencias inválidas o enlaces simbólicos." >&2
    exit 1
  fi
  while IFS= read -r file; do
    if [ ! -s "$INDEX_DIR/$file" ]; then
      echo "Falta un archivo del índice privado TEXORO: $file" >&2
      exit 1
    fi
  done <<< "$INDEX_FILES"

  FREQUENCY_STAGE="$(mktemp -d "$ROOT_DIR/deploy/input/.frequencies.XXXXXX")"
  trap 'rm -rf "$FREQUENCY_STAGE"' EXIT
  FREQUENCY_DIR="$FREQUENCY_STAGE/search-frequencies"
  FREQUENCY_MANIFEST="$FREQUENCY_DIR/manifest.json"
  node "$ROOT_DIR/deploy/scripts/build-frequency-index.mjs" --input "$INDEX_DIR" --output "$FREQUENCY_DIR"

  # Check the generated snapshot before any remote writes. An unexpected file is
  # an error, even if it is absent from the manifest.
  if ! FREQUENCY_FILES="$(jq -er --arg version "$INDEX_VERSION" '
    if .indexVersion == $version and .features.positions == false and
       .features.proximity == false and .features.byteOffsets == false and
       (.shards | keys) == ["kgrams", "postings", "vocab"] then
      [.files[], .shards[][] .file] | unique | .[] |
      if type == "string" and test("^(manifest|works|public-ids|vocab|kgrams|wildcard-lengths)\\.json$|^(postings/p-|vocab-shards/v-|kgram-shards/kg-)[0-9]+\\.json$")
      then . else error("Ruta no autorizada para el índice de frecuencias") end
    else error("Manifiesto de frecuencias no válido o de otra versión") end
  ' "$FREQUENCY_MANIFEST")" ||
     [ -n "$(find "$FREQUENCY_DIR" ! -type d ! -type f -print -quit)" ] ||
     [ "$(LC_ALL=C sort <<< "$FREQUENCY_FILES")" != "$(cd "$FREQUENCY_DIR" && find . -type f -print | cut -c3- | LC_ALL=C sort)" ]; then
    echo "El índice público de frecuencias contiene archivos o referencias no autorizados." >&2
    exit 1
  fi
fi

AWS_PROFILE_FOR_R2=""
SEPARATE_INDEX_CREDENTIALS=0
if [ -n "${R2_TEXORO_INDEX_PUBLISH_ACCESS_KEY_ID:-}" ] || [ -n "${R2_TEXORO_INDEX_PUBLISH_SECRET_ACCESS_KEY:-}" ]; then
  SEPARATE_INDEX_CREDENTIALS=1
fi
if [ "$DRY_RUN" != "true" ]; then
  command -v aws >/dev/null || { echo "Falta aws cli"; exit 1; }
  : "${R2_ACCOUNT_ID:?Falta R2_ACCOUNT_ID en .env.deploy}"
  if [ "$SEPARATE_INDEX_CREDENTIALS" -eq 1 ] || [ "$PRIVATE_INDEX_BUCKET" != "$PRIVATE_TEXT_BUCKET" ]; then
    : "${R2_TEXORO_INDEX_PUBLISH_ACCESS_KEY_ID:?Falta R2_TEXORO_INDEX_PUBLISH_ACCESS_KEY_ID en .env.deploy}"
    : "${R2_TEXORO_INDEX_PUBLISH_SECRET_ACCESS_KEY:?Falta R2_TEXORO_INDEX_PUBLISH_SECRET_ACCESS_KEY en .env.deploy}"
  fi

  if [ "$PHASE" != "activate" ] || [ "$SEPARATE_INDEX_CREDENTIALS" -eq 0 ]; then
    if [ -n "${R2_ACCESS_KEY_ID:-}" ] || [ -n "${R2_SECRET_ACCESS_KEY:-}" ]; then
      : "${R2_ACCESS_KEY_ID:?Falta R2_ACCESS_KEY_ID en .env.deploy}"
      : "${R2_SECRET_ACCESS_KEY:?Falta R2_SECRET_ACCESS_KEY en .env.deploy}"
      export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
      export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
      unset AWS_PROFILE AWS_DEFAULT_PROFILE
    else
      : "${AWS_PROFILE:?Falta AWS_PROFILE o R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY en .env.deploy}"
      AWS_PROFILE_FOR_R2="$AWS_PROFILE"
    fi
  fi
fi

ACCOUNT_ID="${R2_ACCOUNT_ID:-dry-run}"
ENDPOINT_URL="${R2_ENDPOINT_URL:-https://${ACCOUNT_ID}.r2.cloudflarestorage.com}"
INDEX_ACCOUNT_ID="${R2_TEXORO_INDEX_ACCOUNT_ID:-$ACCOUNT_ID}"
if [ "$PRIVATE_INDEX_BUCKET" = "$PRIVATE_TEXT_BUCKET" ]; then
  INDEX_ENDPOINT_URL="${R2_TEXORO_INDEX_ENDPOINT_URL:-$ENDPOINT_URL}"
  if [ "$INDEX_ACCOUNT_ID" != "$ACCOUNT_ID" ] || [ "$INDEX_ENDPOINT_URL" != "$ENDPOINT_URL" ]; then
    echo "El índice y los TXT compartidos deben usar la misma cuenta y endpoint R2." >&2
    exit 1
  fi
else
  INDEX_ENDPOINT_URL="${R2_TEXORO_INDEX_ENDPOINT_URL:-https://${INDEX_ACCOUNT_ID}.r2.cloudflarestorage.com}"
fi
INDEX_REMOTE="s3://$PRIVATE_INDEX_BUCKET/$PRIVATE_INDEX_PREFIX"
INDEX_RELEASE="$INDEX_REMOTE/releases/$INDEX_VERSION"
FREQUENCY_RELEASE="s3://$FREQUENCY_INDEX_BUCKET/$FREQUENCY_INDEX_PREFIX/releases/$INDEX_VERSION"

print_aws_plan() {
  printf '   DRY_RUN: aws'
  printf ' %q' "$@"
  printf '\n'
}

run_aws() {
  if [ "$DRY_RUN" = "true" ]; then
    print_aws_plan "$@"
  elif [ -n "$AWS_PROFILE_FOR_R2" ]; then
    aws --profile "$AWS_PROFILE_FOR_R2" "$@"
  else
    aws "$@"
  fi
}

run_index_aws() (
  if [ "$DRY_RUN" = "true" ] || [ "$SEPARATE_INDEX_CREDENTIALS" -eq 0 ]; then
    run_aws "$@"
    return
  fi
  unset AWS_PROFILE AWS_DEFAULT_PROFILE AWS_SESSION_TOKEN
  export AWS_ACCESS_KEY_ID="$R2_TEXORO_INDEX_PUBLISH_ACCESS_KEY_ID"
  export AWS_SECRET_ACCESS_KEY="$R2_TEXORO_INDEX_PUBLISH_SECRET_ACCESS_KEY"
  aws "$@"
)

if [ "$PHASE" != "activate" ]; then
  echo "==> Preparando la versión privada del índice TEXORO"
  run_index_aws s3 sync "$INDEX_DIR" "$INDEX_RELEASE/" \
    --endpoint-url "$INDEX_ENDPOINT_URL" --only-show-errors --no-follow-symlinks --exclude manifest.json
  run_index_aws s3 cp "$INDEX_MANIFEST" "$INDEX_RELEASE/manifest.json" \
    --endpoint-url "$INDEX_ENDPOINT_URL" --only-show-errors --content-type application/json --cache-control no-store

  echo "==> Preparando las frecuencias públicas de la misma versión"
  run_aws s3 sync "$FREQUENCY_DIR" "$FREQUENCY_RELEASE/" \
    --endpoint-url "$ENDPOINT_URL" --only-show-errors --no-follow-symlinks --exclude manifest.json \
    --cache-control 'public,max-age=31536000,immutable'
  run_aws s3 cp "$FREQUENCY_MANIFEST" "$FREQUENCY_RELEASE/manifest.json" \
    --endpoint-url "$ENDPOINT_URL" --only-show-errors --content-type application/json \
    --cache-control 'public,max-age=31536000,immutable'
fi

if [ "$PHASE" = "all" ] || [ "$PHASE" = "stage" ]; then
  echo "==> Sincronizando los demás destinos R2"
  while IFS= read -r item; do
    NAME="$(jq -r '.name' <<< "$item")"
    case "$NAME" in search|frecuencias) continue ;; esac
    LOCAL_REL="$(jq -r '.local' <<< "$item")"
    BUCKET="$(jq -r '.bucket' <<< "$item")"
    PREFIX="$(jq -r '.prefix' <<< "$item")"
    REMOTE="s3://$BUCKET/${PREFIX:+$PREFIX/}"
    echo "   - $NAME: $LOCAL_REL -> $REMOTE"
    SYNC_ARGS=(s3 sync "$ROOT_DIR/$LOCAL_REL" "$REMOTE"
      --endpoint-url "$ENDPOINT_URL" --only-show-errors --no-follow-symlinks --delete)
    if [ "$NAME" = "textos" ]; then
      # Keep the colocated index releases and the activation manifest on TXT sync.
      SYNC_ARGS+=(--exclude "$PRIVATE_TEXT_INDEX_PREFIX" --exclude "$PRIVATE_TEXT_INDEX_PREFIX/*")
    fi
    run_aws "${SYNC_ARGS[@]}"
  done <<< "$TARGETS"
fi

if [ "$PHASE" = "all" ] || [ "$PHASE" = "activate" ]; then
  echo "==> Activando la versión privada del índice TEXORO"
  run_index_aws s3 cp "$INDEX_RELEASE/manifest.json" "$INDEX_REMOTE/manifest.json" \
    --endpoint-url "$INDEX_ENDPOINT_URL" --only-show-errors --metadata-directive REPLACE \
    --content-type application/json --cache-control no-store
fi

echo "==> R2 sincronizado"
