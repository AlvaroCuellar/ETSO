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

LOCAL_DUMP="$TMP_DIR/local-dump.sql"
DEFERRED_LOCAL_DUMP="$TMP_DIR/local-dump-deferred.sql"
RESET_REMOTE="$TMP_DIR/reset-remote.sql"
REPLACE_SQL="$TMP_DIR/replace-remote.sql"
REMOTE_BACKUP="$BACKUP_DIR/${TURSO_DB_NAME}-${STAMP}.sql"

command -v sqlite3 >/dev/null || { echo "Falta sqlite3"; exit 1; }
if TURSO_MODE="$(detect_turso_mode)"; then
  export TURSO_MODE
else
  echo "Falta Turso CLI: instala turso nativo o turso dentro de WSL"
  exit 1
fi

mkdir -p "$TMP_DIR"
mkdir -p "$BACKUP_DIR"

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

echo "==> Generando backup de Turso actual"

run_turso db shell "$TURSO_DB_NAME" .dump > "$REMOTE_BACKUP"

if [ ! -s "$REMOTE_BACKUP" ]; then
  echo "El backup remoto está vacío. Cancelo."
  exit 1
fi

echo "Backup guardado en:"
echo "$REMOTE_BACKUP"

echo "==> Generando dump desde SQLite local"

sqlite3 "$LOCAL_DB" ".dump" > "$LOCAL_DUMP"

if [ ! -s "$LOCAL_DUMP" ]; then
  echo "El dump local está vacío. Cancelo."
  exit 1
fi

echo "==> Generando SQL de limpieza remota"

cat > "$RESET_REMOTE" <<'SQL'
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
PRAGMA defer_foreign_keys=ON;
SQL

sqlite3 "$LOCAL_DB" <<'SQL' >> "$RESET_REMOTE"
SELECT 'DROP VIEW IF EXISTS "' || name || '";'
FROM sqlite_schema
WHERE type='view'
ORDER BY name;

SELECT 'DROP TRIGGER IF EXISTS "' || name || '";'
FROM sqlite_schema
WHERE type='trigger'
ORDER BY name;

SELECT 'DROP TABLE IF EXISTS "' || name || '";'
FROM sqlite_schema
WHERE type='table'
  AND name NOT LIKE 'sqlite_%'
ORDER BY name;
SQL

cat >> "$RESET_REMOTE" <<'SQL'
COMMIT;
PRAGMA foreign_keys=ON;
SQL

awk '
  { print }
  /^BEGIN TRANSACTION;$/ && inserted == 0 {
    print "PRAGMA defer_foreign_keys=ON;"
    inserted = 1
  }
' "$LOCAL_DUMP" > "$DEFERRED_LOCAL_DUMP"

cat "$RESET_REMOTE" "$DEFERRED_LOCAL_DUMP" > "$REPLACE_SQL"

echo "==> Reemplazando contenido de Turso: $TURSO_DB_NAME"

run_turso db shell "$TURSO_DB_NAME" < "$REPLACE_SQL"

echo "==> Verificando Turso"

REMOTE_INTEGRITY="$(run_turso db shell "$TURSO_DB_NAME" "PRAGMA integrity_check;")"

echo "$REMOTE_INTEGRITY"

echo "==> Base Turso reemplazada"
