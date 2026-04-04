#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "FreeMux development environment check"
echo ""

check_command() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    printf "  [ok]   %s -> %s\n" "$name" "$(command -v "$name")"
  else
    printf "  [miss] %s\n" "$name"
  fi
}

check_command node
check_command npm
check_command cargo
check_command rustc
check_command ffmpeg
check_command ffprobe

echo ""

if command -v rustc >/dev/null 2>&1; then
  echo "Rust version:"
  rustc -V
fi

if command -v cargo >/dev/null 2>&1; then
  echo "Cargo version:"
  cargo -V
fi

if command -v node >/dev/null 2>&1; then
  echo "Node version:"
  node -v
fi

if command -v npm >/dev/null 2>&1; then
  echo "npm version:"
  npm -v
fi

echo ""
echo "Project checks"

if [[ -f "${ROOT_DIR}/package.json" ]]; then
  echo "  [ok]   package.json"
else
  echo "  [miss] package.json"
fi

if [[ -d "${ROOT_DIR}/node_modules" ]]; then
  echo "  [ok]   node_modules"
else
  echo "  [miss] node_modules"
fi

if [[ -f "${ROOT_DIR}/rust-toolchain.toml" ]]; then
  echo "  [ok]   rust-toolchain.toml"
else
  echo "  [miss] rust-toolchain.toml"
fi

echo ""
echo "Recommended commands:"
echo "  make install"
echo "  make ffmpeg-check"
echo "  make dev"
