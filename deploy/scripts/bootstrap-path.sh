#!/usr/bin/env bash

add_path_if_dir() {
  if [ -d "$1" ]; then
    PATH="$1:$PATH"
  fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

add_path_if_dir "$HOME/.turso"
add_path_if_dir "$ROOT_DIR/deploy/tools/node/bin"
add_path_if_dir "$ROOT_DIR/deploy/tools/bin"
add_path_if_dir "/c/Program Files/Amazon/AWSCLIV2"

if command -v cygpath >/dev/null && [ -n "${LOCALAPPDATA:-}" ]; then
  LOCAL_APPDATA_UNIX="$(cygpath -u "$LOCALAPPDATA")"
  add_path_if_dir "$LOCAL_APPDATA_UNIX/Microsoft/WinGet/Packages/jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe"
  add_path_if_dir "$LOCAL_APPDATA_UNIX/Microsoft/WinGet/Packages/SQLite.SQLite_Microsoft.Winget.Source_8wekyb3d8bbwe"
fi

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
  nvm use 24 >/dev/null 2>&1 || true
fi

export PATH
