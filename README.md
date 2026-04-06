# FreeMux

FreeMux is a cross-platform desktop FFmpeg converter built with Tauri 2, Vue 3, and TypeScript.

License: MIT. See `LICENSE`.

## Features

- **Multi-file input** — add multiple files or folders at once
- **Video preview** — preview selected files with an inline HTML5 video player
- **Media inspection** — probe files with `ffprobe` to view container, duration, bitrate, stream details
- **Conversion profiles** — create, edit, duplicate, save, and delete reusable conversion presets
- **Batch conversion** — convert multiple files sequentially with per-file and overall progress tracking
- **Cancel support** — stop a running conversion at any time
- **Command preview** — see the generated FFmpeg command with a copy-to-clipboard button
- **Post-conversion actions** — open output folder or individual files when done
- **Starter profiles** — includes H.264 1080p, DaVinci Resolve MOV, HEVC archive, and MP3 extract presets
- **Cross-platform** — builds for Windows, macOS, and Linux

## UI Layout

The app has three tabs:

- **Source** — add/remove media files, preview video, inspect probe data
- **Settings** — select and configure conversion profiles
- **Output** — set output folder, edit filenames, preview command, run conversion, monitor progress

## Architecture

### Architectural rule

- **TypeScript** owns product logic: profile modeling, command planning, batch orchestration, UI state
- **Rust** owns native integration only: file dialogs, locating binaries, running `ffprobe`/`ffmpeg`, profile persistence, progress events, cancel support

### Frontend

- `src/domain/` — typed models for probe data, conversion profiles, source files, batch progress
- `src/stores/useConverterStore.ts` — centralized state and all app workflows
- `src/services/desktopClient.ts` — Tauri bridge for dialogs, commands, events, and native opener
- `src/utils/ffmpegArgs.ts` — builds FFmpeg arguments from a profile
- `src/utils/pathing.ts` — path manipulation (basename, dirname, output path derivation)
- `src/utils/formatters.ts` — duration, file size, bitrate, frame rate formatting
- `src/components/` — Source inspector, file list, video preview, settings panel, output panel, command preview

### Backend

- `src-tauri/src/commands.rs` — Tauri command entrypoints including `cancel_conversion`
- `src-tauri/src/ffmpeg.rs` — tool discovery, `ffprobe` execution, `ffmpeg` execution with progress and PID tracking
- `src-tauri/src/profiles.rs` — JSON-backed profile persistence
- `src-tauri/src/models.rs` — Rust-side request/response types and `ConversionState` for cancel support

## FFmpeg and FFprobe strategy

Lookup order:

1. `FFMPEG_PATH` / `FFPROBE_PATH` environment variables
2. Bundled binaries inside app resources
3. System-installed `ffmpeg` / `ffprobe` on `PATH`

### Bundled binary layout

```text
src-tauri/resources/bin/windows/ffmpeg.exe
src-tauri/resources/bin/windows/ffprobe.exe
src-tauri/resources/bin/macos/ffmpeg
src-tauri/resources/bin/macos/ffprobe
src-tauri/resources/bin/linux/ffmpeg
src-tauri/resources/bin/linux/ffprobe
```

The repo does not include FFmpeg binaries. Before shipping public releases, verify FFmpeg license obligations.

## Local setup

### 1. Install system prerequisites

Follow the Tauri prerequisites for your platform: https://v2.tauri.app/start/prerequisites/

On Linux (Debian), you also need GStreamer plugins for video preview in the webview:

```bash
sudo apt install gstreamer1.0-plugins-ugly gstreamer1.0-plugins-bad gstreamer1.0-libav
```

### 2. Install project dependencies

```bash
npm install
```

### 3. Make FFmpeg tools available

Install `ffmpeg` and `ffprobe` on `PATH`, or set `FFMPEG_PATH`/`FFPROBE_PATH`, or place bundled binaries in `src-tauri/resources/bin/<platform>/`.

### 4. Run the desktop app

```bash
make dev
```

## Developer helpers

```bash
make help           # list all targets
make bootstrap      # install Debian system deps
make install        # npm install
make check          # dev environment check
make ffmpeg-check   # verify ffmpeg/ffprobe
make test           # run tests
make build          # frontend build
make dev            # run Tauri dev
make tauri-build    # production build
```

## Testing

```bash
npm run test
```

Tests cover:

- `src/tests/ffmpegArgs.spec.ts` — FFmpeg argument generation
- `src/tests/converterStore.spec.ts` — store behavior (multi-file, batch conversion, profiles)
- `src/tests/ConversionOptionsPanel.spec.ts` — settings panel component
- `src/tests/pathing.spec.ts` — path utility functions

## How it works

### Source tab

1. Click **Open files** or **Add folder** to add media files
2. Files are automatically probed with `ffprobe`
3. Select a file to see its video preview and detailed probe data
4. Remove individual files or clear all

### Settings tab

1. Select a profile from the dropdown or create a new one
2. Edit profile settings: container, video codec, audio codec, bitrate, CRF, preset, resolution, etc.
3. Save, duplicate, or delete profiles

### Output tab

1. Set the output folder (auto-derived from input file location)
2. Edit individual output filenames if needed
3. Review the generated FFmpeg command (copy it with one click)
4. Click **Start Conversion** to begin batch processing
5. Monitor per-file and overall progress in real time
6. Cancel if needed, or open output folder/files when done

## Build

```bash
npm run build           # frontend only
npm run tauri build     # desktop bundles
```

Build artifacts go to `src-tauri/target/release/bundle/`.

## Linux development notes

For Linux dev, `make dev` injects WebKitGTK workaround environment variables:

- `WEBKIT_DISABLE_DMABUF_RENDERER=1`
- `WEBKIT_DISABLE_COMPOSITING_MODE=1`

These prevent white/broken webview windows on certain GPU configurations. Do not remove unless confirmed unnecessary on your setup.

## GitHub Actions

- `.github/workflows/ci.yml` — CI checks
- `.github/workflows/release.yml` — cross-platform release builds (scaffolding, not fully production-hardened)
