#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
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

: "${R2_ACCOUNT_ID:?Falta R2_ACCOUNT_ID en .env.deploy}"

ENDPOINT_URL="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
DRY_RUN="${DRY_RUN:-false}"

command -v aws >/dev/null || { echo "Falta aws cli"; exit 1; }
command -v jq >/dev/null || { echo "Falta jq"; exit 1; }

if [ -n "${R2_ACCESS_KEY_ID:-}" ] || [ -n "${R2_SECRET_ACCESS_KEY:-}" ]; then
  : "${R2_ACCESS_KEY_ID:?Falta R2_ACCESS_KEY_ID en .env.deploy}"
  : "${R2_SECRET_ACCESS_KEY:?Falta R2_SECRET_ACCESS_KEY en .env.deploy}"
  export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
  export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
  unset AWS_PROFILE
  unset AWS_DEFAULT_PROFILE
  AWS_AUTH_ARGS=()
else
  : "${AWS_PROFILE:?Falta AWS_PROFILE o R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY en .env.deploy}"
  AWS_AUTH_ARGS=(--profile "$AWS_PROFILE")
fi

if [ ! -f "$CONFIG_FILE" ]; then
  echo "No existe el archivo de configuración: $CONFIG_FILE"
  exit 1
fi

echo "==> Comprobando buckets de R2"

jq -r '.[].bucket' "$CONFIG_FILE" | tr -d '\r' | sort -u | while read -r bucket; do
  aws s3api head-bucket \
    --bucket "$bucket" \
    "${AWS_AUTH_ARGS[@]}" \
    --endpoint-url "$ENDPOINT_URL" >/dev/null
done

echo "==> Sincronizando R2"

jq -c '.[]' "$CONFIG_FILE" | tr -d '\r' | while read -r item; do
  NAME="$(echo "$item" | jq -r '.name')"
  LOCAL_REL="$(echo "$item" | jq -r '.local')"
  BUCKET="$(echo "$item" | jq -r '.bucket')"
  PREFIX="$(echo "$item" | jq -r '.prefix')"
  DELETE="$(echo "$item" | jq -r '.delete')"

  LOCAL_ABS="$ROOT_DIR/$LOCAL_REL"

  if [ ! -d "$LOCAL_ABS" ]; then
    echo "No existe la carpeta local para $NAME: $LOCAL_ABS"
    exit 1
  fi

  if [ -z "$PREFIX" ]; then
    REMOTE="s3://$BUCKET/"
  else
    REMOTE="s3://$BUCKET/$PREFIX/"
  fi

  echo "   - $NAME: $LOCAL_REL -> $REMOTE"

  CMD=(
    aws s3 sync "$LOCAL_ABS" "$REMOTE"
    "${AWS_AUTH_ARGS[@]}"
    --endpoint-url "$ENDPOINT_URL"
    --only-show-errors
  )

  if [ "$DELETE" = "true" ]; then
    CMD+=(--delete)
  fi

  if [ "$DRY_RUN" = "true" ]; then
    CMD+=(--dryrun)
  fi

  "${CMD[@]}"
done

echo "==> R2 sincronizado"
