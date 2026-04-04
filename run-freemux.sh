#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export WEBKIT_DISABLE_GPU=1
export WEBKIT_DISABLE_DMABUF_RENDERER=1
export WEBKIT_DISABLE_COMPOSITING_MODE=1

exec "$SCRIPT_DIR/FreeMux_0.1.0_amd64.AppImage" "$@"
