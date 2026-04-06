#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export WEBKIT_DISABLE_GPU=1
export WEBKIT_DISABLE_DMABUF_RENDERER=1
export WEBKIT_DISABLE_COMPOSITING_MODE=1

shopt -s nullglob
appimages=("$SCRIPT_DIR"/FreeMux_*.AppImage)
shopt -u nullglob

if ((${#appimages[@]} == 0)); then
  echo "Error: no FreeMux AppImage found in $SCRIPT_DIR (expected FreeMux_*.AppImage)." >&2
  exit 1
fi

if ((${#appimages[@]} > 1)); then
  echo "Warning: multiple FreeMux AppImages found in $SCRIPT_DIR; using ${appimages[0]}." >&2
fi

APPIMAGE_PATH="${appimages[0]}"

exec "$APPIMAGE_PATH" "$@"
