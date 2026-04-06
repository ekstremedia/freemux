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
- converting media with `ffmpeg` (single or batch)
- saving/loading editable conversion profiles
- shipping builds for Linux, Windows, and macOS

The most important real-world workflow right now is:

- converting OBS or gaming recordings into Resolve-friendly edit media on Linux
- preserving multiple audio tracks
- batch converting multiple files with progress tracking

## Architectural rules

Keep this split:

- TypeScript owns product logic, profile modeling, command planning, batch orchestration, and most app behavior.
- Rust owns native integration only:
  - file dialogs
  - locating bundled/system binaries
  - running `ffprobe`
  - running `ffmpeg`
  - persisting profiles
  - emitting progress events
  - cancel support (PID-based process kill)

Do not move general app logic into Rust unless there is a clear native requirement.

## Current app structure

### Frontend

- `src/App.vue`
  - main shell with 3-tab layout: Source | Settings | Output
- `src/stores/useConverterStore.ts`
  - centralized state and all workflows (multi-file, batch conversion, profiles)
- `src/domain/conversion.ts`
  - conversion profile types, starter profiles, clone/upsert helpers
- `src/domain/media.ts`
  - probe models, progress models, `SourceFile`, `BatchProgress` types
- `src/utils/ffmpegArgs.ts`
  - TypeScript FFmpeg command generation
- `src/utils/pathing.ts`
  - `suggestOutputPath`, `suggestBatchOutputPath`, `basename`, `dirname`
- `src/utils/formatters.ts`
  - duration, file size, bitrate, frame rate formatting
- `src/services/desktopClient.ts`
  - `DesktopClient` interface wrapping Tauri invoke, dialog, events, and opener APIs
- `src/components/SourceInspector.vue`
  - multi-file add/remove, video preview, probe details
- `src/components/SourceFileList.vue`
  - compact scrollable file list with metadata summaries
- `src/components/VideoPreview.vue`
  - HTML5 `<video>` preview using Tauri `convertFileSrc` asset protocol
- `src/components/ConversionOptionsPanel.vue`
  - profile selection, editing, management (Settings tab)
- `src/components/OutputPanel.vue`
  - output folder, editable filenames, command preview, start/cancel, batch progress, post-conversion actions
- `src/components/CommandPreview.vue`
  - generated command preview with copy-to-clipboard button

### Backend

- `src-tauri/src/commands.rs`
  - Tauri commands: `get_tooling_status`, `probe_media`, `load_profiles`, `save_profile`, `delete_profile`, `run_conversion`, `cancel_conversion`
- `src-tauri/src/ffmpeg.rs`
  - tool lookup, probing, ffmpeg execution, progress emission, PID tracking for cancel
- `src-tauri/src/profiles.rs`
  - JSON profile persistence
- `src-tauri/src/models.rs`
  - Rust request/response models + `ConversionState` (child PID mutex for cancel)

## Important implemented behavior

### Multi-file support

The app supports adding multiple files at once via file picker or folder selection. Files are stored as `SourceFile` objects in the store, each with their own probe data, output path, progress, and status.

Key types in `src/domain/media.ts`:

```ts
interface SourceFile {
  id: string;
  inputPath: string;
  outputPath: string;
  probe: MediaProbe | null;
  isProbing: boolean;
  progress: ConversionProgress | null;
  status: "pending" | "running" | "completed" | "failed";
}

interface BatchProgress {
  phase: "idle" | "running" | "completed" | "cancelled" | "failed";
  currentFileIndex: number;
  totalFiles: number;
  overallPercent: number;
}
```

### Batch conversion

Batch conversion is orchestrated from TypeScript, not Rust. The store's `runBatchConversion()` loops through files sequentially, calling the single-file `runConversion` Tauri command for each. Per-file progress is routed via the existing `conversion-progress` event subscription.

### Cancel support

Cancel uses PID-based process kill:

- Rust stores the child ffmpeg PID in `ConversionState` (a `Mutex<Option<u32>>` in Tauri managed state)
- `cancel_conversion` command reads the PID and sends `SIGTERM` (Unix) or `taskkill` (Windows)
- TypeScript sets `batchProgress.phase = "cancelled"` to break the batch loop

### Resolve-friendly profile

There is a built-in profile for Resolve editing:

- `Resolve edit MOV (copy video + PCM audio tracks)`

Command shape:

```bash
ffmpeg -i input.mkv -map 0:v -map 0:a -c:v copy -c:a pcm_s16le output.mov
```

Do not regress stream mapping.

### Stream mapping

Both TS and Rust command generation explicitly map streams:

- normal video outputs: `-map 0:v -map 0:a`
- audio-only outputs like `mp3`: `-map 0:a`
- no-audio outputs: `-map 0:v`

### Progress reporting

FFmpeg progress is emitted from Rust and displayed live in the UI.

- Rust adds `-progress pipe:2 -nostats`
- parses structured progress lines from stderr
- emits `conversion-progress` events through Tauri
- store subscribes once during initialization
- progress is routed to the current batch file via `batchProgress.currentFileIndex`

### Video preview

Uses Tauri's asset protocol (`convertFileSrc` from `@tauri-apps/api/core`) to convert local file paths to `asset://` URLs for the HTML5 `<video>` element.

Requires:

- `protocol-asset` Cargo feature on `tauri` dependency
- `assetProtocol.enable: true` and scope in `tauri.conf.json`
- On Linux: GStreamer plugins (`gstreamer1.0-plugins-ugly`, `gstreamer1.0-plugins-bad`, `gstreamer1.0-libav`) for codec support

MKV and some other formats may not preview in WebKitGTK due to limited codec support. The preview shows a diagnostic error message when playback fails.

## Current UI structure

### 3-tab layout

1. **Source** — file add/remove, file list, video preview, probe details
2. **Settings** — profile selector, profile editing (all codec/container/quality settings)
3. **Output** — output folder, editable per-file names, command preview with copy, start/cancel conversion, per-file + overall progress, post-conversion open folder/file

### UI preferences

- Clean, elegant, compact
- Desktop-like, not like a long landing page
- Progress and output as primary controls
- No large explanatory widgets or startup-dashboard clutter

### Styling

Tailwind CSS v4. `src/styles.css` just imports Tailwind base layers. `@tailwindcss/vite` plugin in Vite config. All styling in component templates.

Common patterns:

- Card: `rounded-[24px] border border-amber-200/15 bg-zinc-900/80 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl`
- Inner card: `rounded-2xl border border-white/5 bg-white/4 p-4`
- Button primary: `rounded-xl border border-amber-300/25 bg-gradient-to-b from-amber-300/25 to-amber-400/10`
- Button secondary: `rounded-xl border border-white/10 bg-white/5`
- Button danger: `rounded-xl border border-rose-300/25 bg-rose-300/10`

## Save-as-new behavior

`Save as new` clones the current profile with a new UUID and unique name like `Name Copy`, `Name Copy 2`, etc. Handled in `src/stores/useConverterStore.ts`.

## Linux/Debian development status

### Runtime workaround

`make dev` injects:

- `WEBKIT_DISABLE_DMABUF_RENDERER=1`
- `WEBKIT_DISABLE_COMPOSITING_MODE=1`

Prevents white/broken webview on some GPU configurations. Do not remove unless confirmed unnecessary.

### Video preview on Linux

Requires GStreamer plugins for H.264/AAC codec support:

```bash
sudo apt install gstreamer1.0-plugins-ugly gstreamer1.0-plugins-bad gstreamer1.0-libav
```

Without these, even MP4 files won't preview (WebKitGTK uses GStreamer for all media decoding).

## Developer workflow

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
- Store behavior (multi-file, batch conversion, profiles)
- Settings panel component
- Path utility functions

Tests are in:

- `src/tests/ffmpegArgs.spec.ts`
- `src/tests/converterStore.spec.ts`
- `src/tests/ConversionOptionsPanel.spec.ts`
- `src/tests/pathing.spec.ts`

If you change command generation, store behavior, or profile management, update tests accordingly.

## FFmpeg distribution strategy

Lookup order:

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

## DesktopClient interface

The `DesktopClient` interface in `src/services/desktopClient.ts` is the contract between frontend and backend:

```ts
interface DesktopClient {
  chooseInputFile(): Promise<string | null>;
  chooseInputFiles(): Promise<string[] | null>;
  chooseFolder(): Promise<string | null>;
  chooseOutputFile(defaultPath: string | null): Promise<string | null>;
  chooseOutputFolder(): Promise<string | null>;
  probeMedia(inputPath: string): Promise<MediaProbe>;
  getToolingStatus(): Promise<ToolingStatus>;
  loadProfiles(): Promise<ConversionProfile[]>;
  saveProfile(profile: ConversionProfile): Promise<ConversionProfile>;
  deleteProfile(profileId: string): Promise<void>;
  runConversion(request: ConversionRunRequest): Promise<ConversionResult>;
  cancelConversion(): Promise<void>;
  openPath(path: string): Promise<void>;
  revealInFolder(path: string): Promise<void>;
  subscribeToConversionProgress(onProgress: (progress: ConversionProgress) => void): Promise<UnlistenFn>;
}
```

Tests use a stub implementation of this interface.

## Known gaps / likely next work

1. Video preview codec support on Linux (GStreamer dependency)
2. Drag-and-drop source file support
3. Add folder scanning (currently just opens folder dialog, doesn't scan for media files)
4. Validation for bad codec/container combinations
5. Remaining time estimation from FFmpeg progress
6. Hardware encoder support (nvenc, videotoolbox, qsv)
7. Import/export of profile files
8. Finalized icons, real FFmpeg packaging per platform, artifact testing

## Practical advice for the next agent

- Prefer small focused edits rather than broad rewrites.
- Keep the Resolve/gaming-recording workflow front and center.
- Do not reintroduce large explanatory widgets or startup-dashboard clutter.
- Treat progress, output path, and convert action as primary controls.
- Keep the app feeling compact and desktop-like.
- Batch conversion is orchestrated from TypeScript — do not move it to Rust.
- The `DesktopClient` interface is the seam for testing — always update the test stub when adding new methods.
