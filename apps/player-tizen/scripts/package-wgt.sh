#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"

if [[ -f "$ROOT_DIR/.env.tizen" ]]; then
  set -a
  . "$ROOT_DIR/.env.tizen"
  set +a
else
  echo "ERROR: .env.tizen not found at $ROOT_DIR/.env.tizen"
  exit 1
fi

TIZEN_PROFILE="${TIZEN_PROFILE:-SignageProfile}"
TIZEN_AUTHOR_CERT_PASSWORD="${TIZEN_AUTHOR_CERT_PASSWORD:-signage1234}"
TIZEN_AUTHOR_CERT_NAME="${TIZEN_AUTHOR_CERT_NAME:-SignageAuthor}"

if [[ -z "${TIZEN_CLI:-}" ]]; then
  echo "ERROR: TIZEN_CLI is not set in .env.tizen"
  exit 1
fi

is_wsl() {
  [[ -f /proc/version ]] && grep -qi microsoft /proc/version
}

run_tizen() {
  if is_wsl; then
    cmd.exe /c "$@" 2>&1 | tr -d '\r'
  else
    "$@"
  fi
}

VERSION="$(grep '"version"' "$ROOT_DIR/package.json" | head -1 | sed 's/.*"version".*"\(.*\)".*/\1/')"
echo "Tizen CLI: $TIZEN_CLI"
echo "Version: $VERSION"

sed -i "/widget/s/version=\"[^\"]*\"/version=\"$VERSION\"/" "$ROOT_DIR/config.xml"

echo "Building for Tizen..."
if is_wsl; then
  WIN_ROOT_DIR="$(wslpath -m "$ROOT_DIR")"
  cmd.exe /c "cd /d $WIN_ROOT_DIR && npx vite build --mode tizen" 2>&1 | tr -d '\r'
else
  npx vite build --mode tizen
fi

profile_exists() {
  run_tizen "$TIZEN_CLI" security-profiles list 2>&1 | grep -q "$TIZEN_PROFILE"
}

if ! profile_exists; then
  echo "Creating certificate and profile: $TIZEN_PROFILE"
  run_tizen "$TIZEN_CLI" certificate \
    -a "$TIZEN_AUTHOR_CERT_NAME" \
    -p "$TIZEN_AUTHOR_CERT_PASSWORD" \
    -f "$TIZEN_PROFILE"
  run_tizen "$TIZEN_CLI" security-profiles add \
    -n "$TIZEN_PROFILE" \
    -a "$TIZEN_PROFILE.p12" \
    -p "$TIZEN_AUTHOR_CERT_PASSWORD"
  echo "Profile created: $TIZEN_PROFILE"
else
  echo "Profile exists: $TIZEN_PROFILE"
fi

if [[ ! -f "$ROOT_DIR/config.xml" ]]; then
  echo "ERROR: config.xml not found"
  exit 1
fi

if [[ ! -d "$DIST_DIR" ]]; then
  echo "ERROR: dist/ not found. Run 'vite build --mode tizen' first."
  exit 1
fi

echo "Copying config.xml to dist/"
cp "$ROOT_DIR/config.xml" "$DIST_DIR/config.xml"

if is_wsl; then
  WIN_DIST_DIR="$(wslpath -m "$DIST_DIR")"
else
  WIN_DIST_DIR="$DIST_DIR"
fi

echo "Packaging WGT with profile: $TIZEN_PROFILE"
run_tizen "$TIZEN_CLI" package -t wgt -s "$TIZEN_PROFILE" -- "$WIN_DIST_DIR"

sleep 1

OUTPUT_NAME="digital_signage_player_${VERSION}.wgt"
shopt -s nullglob
WGT_FILES=("$DIST_DIR"/*.wgt)
shopt -u nullglob

if [[ ${#WGT_FILES[@]} -eq 0 ]]; then
  echo "ERROR: WGT file not found after packaging"
  exit 1
fi

mv "${WGT_FILES[0]}" "$ROOT_DIR/$OUTPUT_NAME"
echo "WGT created: $ROOT_DIR/$OUTPUT_NAME ($(du -h "$ROOT_DIR/$OUTPUT_NAME" | cut -f1))"
