#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  SUDO="sudo"
else
  SUDO=""
fi

echo "Installing Debian packages required for FreeMux development..."

${SUDO} apt update
${SUDO} apt install -y \
  build-essential \
  curl \
  file \
  ffmpeg \
  libwebkit2gtk-4.1-dev \
  librsvg2-dev \
  patchelf \
  pkg-config \
  wget

cat <<'EOF'

System packages installed.

Next steps:
  1. Install a current Rust toolchain with rustup if needed
  2. Run: npm install
  3. Run: ./scripts/dev-check.sh
  4. Run: npm run tauri dev

EOF
