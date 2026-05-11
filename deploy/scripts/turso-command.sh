#!/usr/bin/env bash

detect_turso_mode() {
  if command -v turso >/dev/null; then
    echo "native"
    return 0
  fi

  local distro="${TURSO_WSL_DISTRO:-Ubuntu}"
  if command -v wsl >/dev/null &&
    MSYS_NO_PATHCONV=1 wsl -d "$distro" -- bash -c 'test -x "$HOME/.turso/turso" && "$HOME/.turso/turso" --version >/dev/null' >/dev/null 2>&1; then
    echo "wsl"
    return 0
  fi

  return 1
}

run_turso() {
  case "${TURSO_MODE:-}" in
    native)
      turso "$@"
      ;;
    wsl)
      local distro="${TURSO_WSL_DISTRO:-Ubuntu}"
      local turso_bin
      turso_bin="$(MSYS_NO_PATHCONV=1 wsl -d "$distro" -- bash -c 'printf "%s" "$HOME/.turso/turso"' | tr -d '\r')"
      MSYS_NO_PATHCONV=1 wsl -d "$distro" -- "$turso_bin" "$@"
      ;;
    *)
      echo "TURSO_MODE no configurado. Ejecuta detect_turso_mode antes de run_turso." >&2
      return 1
      ;;
  esac
}
