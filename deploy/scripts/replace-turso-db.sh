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
TURSO_LOCAL_DUMP="$TMP_DIR/local-dump-turso.sql"
DEFERRED_LOCAL_DUMP="$TMP_DIR/local-dump-deferred.sql"
RESET_REMOTE="$TMP_DIR/reset-remote.sql"
REPLACE_SQL="$TMP_DIR/replace-remote.sql"
REMOTE_BACKUP="$BACKUP_DIR/${TURSO_DB_NAME}-${STAMP}.sql"

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

echo "==> Generando dump desde SQLite local"

sqlite3 "$LOCAL_DB" ".dump" > "$LOCAL_DUMP"

if [ ! -s "$LOCAL_DUMP" ]; then
  echo "El dump local está vacío. Cancelo."
  exit 1
fi

echo "==> Adaptando dump para Turso"

python3 - "$LOCAL_DUMP" "$TURSO_LOCAL_DUMP" <<'PY'
import sys
from pathlib import Path

source = Path(sys.argv[1])
target = Path(sys.argv[2])

def decode_unistr_value(value):
    value = value.replace("''", "'")
    output = []
    index = 0
    while index < len(value):
        char = value[index]
        if char != "\\":
            output.append(char)
            index += 1
            continue

        if index + 1 >= len(value):
            output.append(char)
            index += 1
            continue

        marker = value[index + 1]
        if marker == "\\":
            output.append("\\")
            index += 2
            continue
        if marker in {"u", "U"}:
            length = 4 if marker == "u" else 8
            start = index + 2
            chunk = value[start:start + length]
            if len(chunk) == length:
                try:
                    output.append(chr(int(chunk, 16)))
                    index = start + length
                    continue
                except ValueError:
                    pass
        if marker == "+":
            start = index + 2
            chunk = value[start:start + 6]
            if len(chunk) == 6:
                try:
                    output.append(chr(int(chunk, 16)))
                    index = start + 6
                    continue
                except ValueError:
                    pass
        chunk = value[index + 1:index + 5]
        if len(chunk) == 4:
            try:
                output.append(chr(int(chunk, 16)))
                index += 5
                continue
            except ValueError:
                pass

        output.append(char)
        index += 1

    return "".join(output)

def sql_quote(value):
    return "'" + value.replace("'", "''") + "'"

def replace_unistr_calls(sql):
    output = []
    index = 0
    needle = "unistr('"
    lower = sql.lower()

    while index < len(sql):
        start = lower.find(needle, index)
        if start == -1:
            output.append(sql[index:])
            break

        output.append(sql[index:start])
        literal_start = start + len("unistr(")
        pos = literal_start + 1
        literal = []

        while pos < len(sql):
            char = sql[pos]
            if char == "'":
                if pos + 1 < len(sql) and sql[pos + 1] == "'":
                    literal.append("''")
                    pos += 2
                    continue
                break
            literal.append(char)
            pos += 1

        if pos >= len(sql) or pos + 1 >= len(sql) or sql[pos + 1] != ")":
            output.append(sql[start])
            index = start + 1
            continue

        decoded = decode_unistr_value("".join(literal))
        output.append(sql_quote(decoded))
        index = pos + 2

    return "".join(output)

filtered = []
for line in source.read_text(encoding="utf-8").splitlines():
    if "FOREIGN KEY" in line.upper():
        if filtered and filtered[-1].rstrip().endswith(","):
            filtered[-1] = filtered[-1].rstrip()[:-1]
        continue
    filtered.append(line)

target.write_text(replace_unistr_calls("\n".join(filtered) + "\n"), encoding="utf-8")
PY

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
ORDER BY
  CASE name
    WHEN 'work_distances' THEN 10
    WHEN 'text_access' THEN 20
    WHEN 'work_author_index' THEN 30
    WHEN 'attribution_members' THEN 40
    WHEN 'attribution_groups' THEN 50
    WHEN 'attribution_sets' THEN 60
    WHEN 'authors' THEN 70
    WHEN 'works' THEN 80
    ELSE 90
  END,
  name;
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
' "$TURSO_LOCAL_DUMP" > "$DEFERRED_LOCAL_DUMP"

cat "$RESET_REMOTE" "$DEFERRED_LOCAL_DUMP" > "$REPLACE_SQL"

echo "==> Reemplazando contenido de Turso: $TURSO_DB_NAME"

run_turso db shell "$TURSO_DB_NAME" < "$REPLACE_SQL"

echo "==> Verificando Turso"

REMOTE_INTEGRITY="$(run_turso db shell "$TURSO_DB_NAME" "PRAGMA integrity_check;")"

echo "$REMOTE_INTEGRITY"

echo "==> Base Turso reemplazada"
