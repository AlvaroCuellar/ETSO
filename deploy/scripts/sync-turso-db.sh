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
fi

: "${TURSO_DB_NAME:?Falta TURSO_DB_NAME en .env.deploy}"
: "${SQLITE_LOCAL_PATH:?Falta SQLITE_LOCAL_PATH en .env.deploy}"

LOCAL_DB="$ROOT_DIR/$SQLITE_LOCAL_PATH"
TMP_DIR="$ROOT_DIR/deploy/tmp"
BACKUP_DIR="$ROOT_DIR/deploy/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"

REMOTE_BACKUP="$BACKUP_DIR/${TURSO_DB_NAME}-${STAMP}.sql"
REMOTE_SQLITE="$TMP_DIR/${TURSO_DB_NAME}-${STAMP}-remote.sqlite"
SYNC_SQL="$TMP_DIR/turso-sync-${STAMP}.sql"
SYNC_REPORT="$TMP_DIR/turso-sync-${STAMP}.json"
EXPECTED_COUNTS="$TMP_DIR/turso-sync-${STAMP}-expected-counts.txt"
COUNT_SQL="$TMP_DIR/turso-sync-counts.sql"
RESULT_ENV="$TMP_DIR/turso-sync-result.env"

command -v sqlite3 >/dev/null || { echo "Falta sqlite3"; exit 1; }
command -v python3 >/dev/null || { echo "Falta python3"; exit 1; }
if TURSO_MODE="$(detect_turso_mode)"; then
  export TURSO_MODE
else
  echo "Falta Turso CLI: instala turso nativo o turso dentro de WSL"
  exit 1
fi

TURSO_WHOAMI="$(run_turso auth whoami 2>&1 || true)"
if echo "$TURSO_WHOAMI" | grep -qi "not logged in"; then
  echo "Turso no está autenticado. Ejecuta: turso auth login"
  exit 1
fi
if [ -z "$TURSO_WHOAMI" ]; then
  echo "No se pudo comprobar la autenticación de Turso."
  exit 1
fi

mkdir -p "$TMP_DIR"
mkdir -p "$BACKUP_DIR"
printf 'CHANGED=0\n' > "$RESULT_ENV"

if [ ! -f "$LOCAL_DB" ]; then
  echo "No existe SQLite local: $LOCAL_DB"
  exit 1
fi

echo "==> Validando SQLite local"

INTEGRITY="$(sqlite3 "$LOCAL_DB" "PRAGMA integrity_check;")"

if [ "$INTEGRITY" != "ok" ]; then
  echo "El SQLite local no pasa integrity_check:"
  echo "$INTEGRITY"
  exit 1
fi

FK_CHECK="$(sqlite3 "$LOCAL_DB" "PRAGMA foreign_key_check;")"

if [ -n "$FK_CHECK" ]; then
  echo "El SQLite local no pasa foreign_key_check:"
  echo "$FK_CHECK"
  exit 1
fi

echo "==> Generando backup de Turso actual"

run_turso db shell "$TURSO_DB_NAME" .dump > "$REMOTE_BACKUP"

if [ ! -s "$REMOTE_BACKUP" ]; then
  echo "El backup remoto está vacío. Cancelo."
  exit 1
fi

echo "Backup guardado en:"
echo "$REMOTE_BACKUP"

echo "==> Restaurando backup remoto en SQLite temporal"

rm -f "$REMOTE_SQLITE"
sqlite3 "$REMOTE_SQLITE" < "$REMOTE_BACKUP"

REMOTE_INTEGRITY_LOCAL="$(sqlite3 "$REMOTE_SQLITE" "PRAGMA integrity_check;")"
if [ "$REMOTE_INTEGRITY_LOCAL" != "ok" ]; then
  echo "El backup remoto restaurado no pasa integrity_check:"
  echo "$REMOTE_INTEGRITY_LOCAL"
  exit 1
fi

echo "==> Calculando parche incremental para Turso"

python3 "$ROOT_DIR/deploy/scripts/generate-turso-sync-sql.py" \
  --local-db "$LOCAL_DB" \
  --remote-db "$REMOTE_SQLITE" \
  --output-sql "$SYNC_SQL" \
  --report-json "$SYNC_REPORT" \
  --expected-counts "$EXPECTED_COUNTS"

if python3 - "$SYNC_REPORT" <<'PY'
import json
import sys
from pathlib import Path

report = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
raise SystemExit(0 if report.get("changed") else 1)
PY
then
  printf 'CHANGED=1\n' > "$RESULT_ENV"
else
  echo "==> Turso ya coincide logicamente con el SQLite local; no se escriben filas"
  exit 0
fi

if [ "${DRY_RUN:-false}" = "true" ]; then
  echo "==> DRY_RUN=true: no se aplica el parche incremental de Turso"
  echo "SQL generado en:"
  echo "$SYNC_SQL"
  exit 0
fi

echo "==> Aplicando parche incremental en Turso: $TURSO_DB_NAME"

run_turso db shell "$TURSO_DB_NAME" < "$SYNC_SQL"

echo "==> Verificando Turso"

REMOTE_INTEGRITY="$(run_turso db shell "$TURSO_DB_NAME" "PRAGMA integrity_check;")"

echo "$REMOTE_INTEGRITY"

REMOTE_INTEGRITY_STATUS="$(printf '%s\n' "$REMOTE_INTEGRITY" | awk '{$1=$1}; $0 == "ok" { found = 1 } END { if (found) print "ok" }')"

if [ "$REMOTE_INTEGRITY_STATUS" != "ok" ]; then
  echo "Turso no pasa integrity_check después de la sincronización incremental."
  exit 1
fi

cat > "$COUNT_SQL" <<'SQL'
SELECT 'works|' || COUNT(*) FROM works
UNION ALL SELECT 'authors|' || COUNT(*) FROM authors
UNION ALL SELECT 'attribution_sets|' || COUNT(*) FROM attribution_sets
UNION ALL SELECT 'attribution_groups|' || COUNT(*) FROM attribution_groups
UNION ALL SELECT 'attribution_members|' || COUNT(*) FROM attribution_members
UNION ALL SELECT 'work_author_index|' || COUNT(*) FROM work_author_index
UNION ALL SELECT 'text_access|' || COUNT(*) FROM text_access
UNION ALL SELECT 'work_distances|' || COUNT(*) FROM work_distances;
SQL

REMOTE_COUNTS="$(
  run_turso db shell "$TURSO_DB_NAME" "$(cat "$COUNT_SQL")" |
    awk '{$1=$1}; /^(works|authors|attribution_sets|attribution_groups|attribution_members|work_author_index|text_access|work_distances)\|[0-9]+$/ { print }'
)"
EXPECTED_COUNTS_TEXT="$(cat "$EXPECTED_COUNTS" | sed '/^[[:space:]]*$/d')"

if [ "$REMOTE_COUNTS" != "$EXPECTED_COUNTS_TEXT" ]; then
  echo "Los recuentos remotos no coinciden con el SQLite local."
  echo "Esperado:"
  echo "$EXPECTED_COUNTS_TEXT"
  echo "Remoto:"
  echo "$REMOTE_COUNTS"
  exit 1
fi

echo "==> Base Turso sincronizada incrementalmente"
echo "Informe:"
echo "$SYNC_REPORT"
