#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TOOLS_DIR="${ETSO_DEPLOY_TOOLS_DIR:-$HOME/.local/etso-deploy}"
TOOLS_BIN="$TOOLS_DIR/bin"

if ! grep -qiE 'microsoft|wsl' /proc/version 2>/dev/null; then
  echo "Este script está pensado para Ubuntu dentro de WSL."
  echo "En macOS usa Homebrew según deploy/README.md."
  exit 1
fi

mkdir -p "$TOOLS_BIN" "$TOOLS_DIR/tmp"

BASHRC="$HOME/.bashrc"
PATH_LINE='export PATH="$HOME/.local/etso-deploy/bin:$PATH"'
if [ -f "$BASHRC" ] && ! grep -Fq '.local/etso-deploy/bin' "$BASHRC"; then
  {
    echo ""
    echo "# ETSO deploy tools"
    echo "$PATH_LINE"
  } >> "$BASHRC"
fi

command -v curl >/dev/null || { echo "Falta curl. Instálalo con: sudo apt-get install curl"; exit 1; }
command -v tar >/dev/null || { echo "Falta tar. Instálalo con: sudo apt-get install tar"; exit 1; }
if ! command -v unzip >/dev/null && ! command -v python3 >/dev/null; then
  echo "Falta unzip o python3. Instala uno con: sudo apt-get install unzip"
  exit 1
fi

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) TOOL_ARCH="x64"; JQ_ARCH="amd64"; AWS_ARCH="x86_64" ;;
  aarch64|arm64) TOOL_ARCH="arm64"; JQ_ARCH="arm64"; AWS_ARCH="aarch64" ;;
  *) echo "Arquitectura no soportada: $ARCH"; exit 1 ;;
esac

NODE_MAJOR="$(node --version 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || true)"
if [ "${NODE_MAJOR:-0}" -lt 24 ]; then
  echo "==> Instalando Node.js 24 con nvm"
  export NVM_DIR="$HOME/.nvm"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  fi
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install 24
  nvm alias default 24
fi

if ! command -v jq >/dev/null; then
  echo "==> Instalando jq portable"
  curl -fsSL "https://github.com/jqlang/jq/releases/download/jq-1.8.1/jq-linux-${JQ_ARCH}" -o "$TOOLS_BIN/jq"
  chmod +x "$TOOLS_BIN/jq"
fi

export PATH="$TOOLS_BIN:$PATH"

repair_aws_permissions() {
  chmod -R u+rwX "$TOOLS_DIR/aws-cli" 2>/dev/null || true
  chmod u+rwx "$TOOLS_BIN/aws" "$TOOLS_BIN/aws_completer" 2>/dev/null || true
}

repair_aws_permissions

if ! command -v aws >/dev/null || ! aws --version >/dev/null 2>&1; then
  echo "==> Instalando AWS CLI v2 en $TOOLS_DIR"
  TMP_DIR="$TOOLS_DIR/tmp/awscli"
  rm -rf "$TMP_DIR"
  mkdir -p "$TMP_DIR"
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" -o "$TMP_DIR/awscliv2.zip"
  if command -v unzip >/dev/null; then
    unzip -q "$TMP_DIR/awscliv2.zip" -d "$TMP_DIR"
  else
    python3 - "$TMP_DIR/awscliv2.zip" "$TMP_DIR" <<'PY'
import sys
import zipfile

with zipfile.ZipFile(sys.argv[1]) as archive:
    archive.extractall(sys.argv[2])
PY
  fi
  bash "$TMP_DIR/aws/install" -i "$TOOLS_DIR/aws-cli" -b "$TOOLS_BIN" --update
  repair_aws_permissions
  rm -rf "$TMP_DIR"
fi

if ! command -v sqlite3 >/dev/null; then
  echo "Falta sqlite3. Instálalo en Ubuntu con:"
  echo "sudo apt-get update && sudo apt-get install -y sqlite3"
  exit 1
fi

if ! command -v turso >/dev/null && [ ! -x "$HOME/.turso/turso" ]; then
  echo "==> Instalando Turso CLI"
  curl -sSfL https://get.tur.so/install.sh | bash
fi

echo "==> Setup Ubuntu terminado"
echo "Abre una nueva terminal Ubuntu o ejecuta: source ~/.bashrc"
echo "Si Turso no está autenticado, ejecuta: turso auth login --headless"
