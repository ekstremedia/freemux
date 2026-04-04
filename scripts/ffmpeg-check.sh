#!/usr/bin/env bash
set -euo pipefail

echo "Checking FFmpeg availability for FreeMux..."
echo ""

if [[ -n "${FFMPEG_PATH:-}" ]]; then
  echo "FFMPEG_PATH=${FFMPEG_PATH}"
else
  echo "FFMPEG_PATH is not set"
fi

if [[ -n "${FFPROBE_PATH:-}" ]]; then
  echo "FFPROBE_PATH=${FFPROBE_PATH}"
else
  echo "FFPROBE_PATH is not set"
fi

echo ""

if command -v ffmpeg >/dev/null 2>&1; then
  echo "[ok] ffmpeg found at $(command -v ffmpeg)"
  ffmpeg -version | head -n 1
else
  echo "[miss] ffmpeg not found on PATH"
fi

if command -v ffprobe >/dev/null 2>&1; then
  echo "[ok] ffprobe found at $(command -v ffprobe)"
  ffprobe -version | head -n 1
else
  echo "[miss] ffprobe not found on PATH"
fi
