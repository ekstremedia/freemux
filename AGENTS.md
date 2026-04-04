# AGENTS.md

This file is a working handoff for AI coding agents continuing work on `FreeMux`.

## Project summary

`FreeMux` is a cross-platform desktop FFmpeg converter built with:

- `Tauri 2`
- `Vue 3`
- `TypeScript`
- `Rust` only as the native host layer

The main product goal is a small, clean desktop app for:

- inspecting media with `ffprobe`
- converting media with `ffmpeg`
- saving/loading editable conversion profiles
- shipping builds for Linux, Windows, and macOS

The most important real-world workflow right now is:

- converting OBS or gaming recordings into Resolve-friendly edit media on Linux
- preserving multiple audio tracks

## Architectural rules

Keep this split:

- TypeScript owns product logic, profile modeling, command planning, and most app behavior.
- Rust owns native integration only:
  - file dialogs
  - locating bundled/system binaries
  - running `ffprobe`
  - running `ffmpeg`
  - persisting profiles
  - emitting progress events

Do not move general app logic into Rust unless there is a clear native requirement.

## Current app structure

### Frontend

- `src/App.vue`
  - main shell and tab layout
- `src/stores/useConverterStore.ts`
  - main state and workflows
- `src/domain/conversion.ts`
  - conversion profile types and starter profiles
- `src/domain/media.ts`
  - probe and progress models
- `src/utils/ffmpegArgs.ts`
  - TypeScript FFmpeg command generation
- `src/components/SourceInspector.vue`
  - file/probe inspector
- `src/components/ConversionOptionsPanel.vue`
  - profile selection, output path, conversion settings, save controls, convert button
- `src/components/ConversionProgressPanel.vue`
  - live progress UI
- `src/components/CommandPreview.vue`
  - generated command preview

### Backend

- `src-tauri/src/commands.rs`
  - Tauri commands exposed to the frontend
- `src-tauri/src/ffmpeg.rs`
  - tool lookup, probing, ffmpeg execution, progress emission
- `src-tauri/src/profiles.rs`
  - JSON profile persistence
- `src-tauri/src/models.rs`
  - Rust request/response models

## Important implemented behavior

### Resolve-friendly profile

There is now a built-in profile for Resolve editing:

- `Resolve edit MOV (copy video + PCM audio tracks)`

Intent:

- copy the original video stream
- convert all audio tracks to `pcm_s16le`
- keep all audio tracks, not just the default one
- write `mov`

Command shape:

```bash
ffmpeg -i input.mkv -map 0:v -map 0:a -c:v copy -c:a pcm_s16le output.mov
```

This is important. Do not regress stream mapping.

### Stream mapping

Both TS and Rust command generation now explicitly map streams:

- normal video outputs: `-map 0:v -map 0:a`
- audio-only outputs like `mp3`: `-map 0:a`
- no-audio outputs: `-map 0:v`

Relevant files:

- `src/utils/ffmpegArgs.ts`
- `src-tauri/src/ffmpeg.rs`

### Progress reporting

FFmpeg progress is emitted from Rust and displayed live in the UI.

Current implementation:

- Rust adds `-progress pipe:2 -nostats`
- parses structured progress lines from stderr
- emits `conversion-progress` events through Tauri
- store subscribes once during initialization
- progress panel renders phase, percent, frame, fps, speed, encoded time

Relevant files:

- `src-tauri/src/ffmpeg.rs`
- `src/services/desktopClient.ts`
- `src/stores/useConverterStore.ts`
- `src/components/ConversionProgressPanel.vue`

## Current UI direction

The UI was recently simplified based on user feedback.

### User preferences

The user explicitly wants:

- a clean, elegant UI
- less vertical sprawl
- fewer explainer widgets
- the progress panel treated as a main feature
- output filename/path treated as a main feature
- the convert action made prominent

### UI changes already made

- removed the top explanatory hero card
- removed the `Tool discovery` widget from the main flow
- simplified the header to:
  - `FreeMux`
  - a short subtitle
- reduced tabs from 3 to 2:
  - `Source`
  - `Convert`
- moved profile selection/management into the `Convert` tab
- moved progress into the `Convert` tab and placed it above the main options
- made output file entry editable directly, not browse-only

### Current UI files most likely to change next

- `src/App.vue`
- `src/components/ConversionOptionsPanel.vue`
- `src/components/ConversionProgressPanel.vue`
- `src/components/SourceInspector.vue`
- `src/styles.css`

## Known UX gaps / likely next work

These are high-value next tasks:

1. Make the Convert tab more compact.
2. Hide advanced options behind a collapsible section or tabs.
3. Improve output filename UX further:
   - auto-suggest extensions based on container
   - maybe separate output directory and filename fields
4. Improve profile management UX inside Convert:
   - current profile selector is functional but still basic
5. Add cancel support for active conversions.
6. Add remaining time estimation from FFmpeg progress.
7. Add drag-and-drop source file support.
8. Add validation for bad codec/container combinations.

## Save-as-new behavior

The user asked whether `Save as new` worked. It now does.

Behavior:

- clones the current profile
- generates a unique name like:
  - `Name Copy`
  - `Name Copy 2`

Relevant file:

- `src/stores/useConverterStore.ts`

If this behavior changes, keep it visibly distinct so the user can tell it worked.

## Linux/Debian development status

The app now runs on the user’s Debian machine, but there were several non-obvious fixes.

### Important runtime workaround

For Linux dev, `make dev` now injects:

- `WEBKIT_DISABLE_DMABUF_RENDERER=1`
- `WEBKIT_DISABLE_COMPOSITING_MODE=1`

Reason:

- the app built successfully, but the webview showed a white/broken window due to WebKitGTK/GBM/KMS rendering issues on this machine

This workaround is currently baked into:

- `Makefile`

Do not remove it casually unless confirmed unnecessary on the user’s setup.

### Local build/tooling reality

This repo had version drift between:

- npm Tauri packages
- Cargo Tauri crates
- Cargo lockfile transitive dependencies

Those were corrected to get Debian dev running.

Important files touched:

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`

If you update Tauri versions, do it deliberately on both JS and Rust sides together.

## Developer workflow

Use the repo’s native-first helpers instead of Docker.

### Commands

```bash
make help
make bootstrap
make install
make check
make ffmpeg-check
make test
make build
make dev
make tauri-build
```

### Helper scripts

- `scripts/bootstrap-debian.sh`
- `scripts/dev-check.sh`
- `scripts/ffmpeg-check.sh`

## Testing expectations

Before handing work back, run at least:

```bash
npm run test
npm run build
```

If touching Linux runtime or Tauri config, also try:

```bash
make dev
```

Current tests cover:

- FFmpeg argument generation
- basic store behavior

Tests are in:

- `src/tests/ffmpegArgs.spec.ts`
- `src/tests/converterStore.spec.ts`

If you change command generation or profile behavior, update/add tests.

## FFmpeg distribution strategy

Current lookup order:

1. `FFMPEG_PATH` / `FFPROBE_PATH`
2. bundled binaries in app resources
3. system `PATH`

Bundled binary layout:

```text
src-tauri/resources/bin/windows/ffmpeg.exe
src-tauri/resources/bin/windows/ffprobe.exe
src-tauri/resources/bin/macos/ffmpeg
src-tauri/resources/bin/macos/ffprobe
src-tauri/resources/bin/linux/ffmpeg
src-tauri/resources/bin/linux/ffprobe
```

The repo does not include FFmpeg binaries.

## Release workflow

GitHub Actions files exist:

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`

They are scaffolding, not fully production-hardened.

Still needed before polished public release:

- finalized icons
- real FFmpeg packaging per platform
- artifact testing on each OS
- optional signing/notarization

## Git status note

At the time this file was written, there are local uncommitted changes from the latest UI and workflow pass.

An agent should check:

```bash
git status --short
```

before making further edits.

## Practical advice for the next agent

- Prefer small focused edits in the UI rather than broad rewrites.
- Keep the Resolve/gaming-recording workflow front and center.
- Do not reintroduce large explanatory widgets or startup-dashboard clutter.
- Treat progress, output path, and convert action as primary controls.
- Keep the app feeling compact and desktop-like, not like a long landing page.
