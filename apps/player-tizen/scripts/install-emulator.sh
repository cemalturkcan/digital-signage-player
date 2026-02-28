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

WGT_INPUT="${1:-}"

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

resolve_wgt_path() {
  if [[ -n "$WGT_INPUT" ]]; then
    if [[ -f "$WGT_INPUT" ]]; then
      echo "$WGT_INPUT"
      return
    fi

    if [[ -f "$ROOT_DIR/$WGT_INPUT" ]]; then
      echo "$ROOT_DIR/$WGT_INPUT"
      return
    fi

    echo "ERROR: WGT file not found: $WGT_INPUT"
    exit 1
  fi

  shopt -s nullglob
  local files=("$ROOT_DIR"/digital_signage_player_*.wgt)
  shopt -u nullglob

  if [[ ${#files[@]} -eq 0 ]]; then
    echo "ERROR: No WGT file found in $ROOT_DIR"
    echo "Run 'pnpm run build' first."
    exit 1
  fi

  local latest="${files[0]}"
  for file in "${files[@]}"; do
    if [[ "$file" -nt "$latest" ]]; then
      latest="$file"
    fi
  done

  echo "$latest"
}

resolve_target_serial() {
  if [[ "$SDB_CLI" != "sdb" && ! -x "$SDB_CLI" ]]; then
    if [[ "$SDB_CLI" != "sdb" ]]; then
      echo "ERROR: sdb not found at $SDB_CLI" >&2
    else
      echo "ERROR: 'sdb' command not found in PATH" >&2
    fi
    echo "Install sdb or add it to PATH." >&2
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

  echo "ERROR: No connected Tizen device/emulator found." >&2
  echo "Connect a target or start one with: tizen-tv" >&2
  exit 1
}

WGT_PATH="$(resolve_wgt_path)"

if is_wsl; then
  WGT_ARG="$(wslpath -m "$WGT_PATH")"
else
  WGT_ARG="$WGT_PATH"
fi

echo "Installing WGT: $WGT_PATH"

TARGET_SERIAL="$(resolve_target_serial)"
echo "Target serial: $TARGET_SERIAL"

run_cmd tizen install -n "$WGT_ARG" -s "$TARGET_SERIAL"

echo "Install completed"
