#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$ROOT_DIR/.env.tizen" ]]; then
  set -a
  . "$ROOT_DIR/.env.tizen"
  set +a
else
  echo "ERROR: .env.tizen not found at $ROOT_DIR/.env.tizen"
  exit 1
fi

if ! command -v tizen >/dev/null 2>&1; then
  echo "ERROR: 'tizen' command not found in PATH"
  echo "Add Tizen CLI to your PATH and retry."
  exit 1
fi

if command -v sdb >/dev/null 2>&1; then
  SDB_CLI="sdb"
else
  SDB_CLI="${SDB_CLI:-$HOME/tizen-studio/tools/sdb}"
fi

APP_PACKAGE_ID="${APP_PACKAGE_ID:-}"

is_wsl() {
  [[ -f /proc/version ]] && grep -qi microsoft /proc/version
}

run_cmd() {
  if is_wsl; then
    cmd.exe /c "$@" 2>&1 | tr -d '\r'
  else
    "$@"
  fi
}

resolve_app_package_id() {
  if [[ -n "$APP_PACKAGE_ID" ]]; then
    echo "$APP_PACKAGE_ID"
    return
  fi

  local package_id
  package_id="$(sed -n 's/.*<tizen:application[^>]*package="\([^"]*\)".*/\1/p' "$ROOT_DIR/config.xml" | head -1)"

  if [[ -z "$package_id" ]]; then
    echo "ERROR: Could not resolve package id from config.xml"
    exit 1
  fi

  echo "$package_id"
}

resolve_target_serial() {
  if [[ "$SDB_CLI" != "sdb" && ! -x "$SDB_CLI" ]]; then
    echo "ERROR: sdb not found at $SDB_CLI"
    exit 1
  fi

  local timeout=45
  local elapsed=0

  while [[ $elapsed -lt $timeout ]]; do
    while IFS= read -r line; do
      line="$(printf '%s' "$line" | tr -d '\r')"
      set -- $line
      local serial="${1:-}"
      local state="${2:-}"

      if [[ "$state" == "device" && "$serial" != "List" ]]; then
        echo "$serial"
        return
      fi
    done < <("$SDB_CLI" devices)

    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "ERROR: No connected Tizen device/emulator found."
  echo "Start one with: tizen-tv"
  exit 1
}

PACKAGE_ID="$(resolve_app_package_id)"
TARGET_SERIAL="$(resolve_target_serial)"

echo "Running package $PACKAGE_ID on target $TARGET_SERIAL"

run_cmd tizen run -p "$PACKAGE_ID" -s "$TARGET_SERIAL"
