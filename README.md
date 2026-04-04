# FreeMux

FreeMux is a cross-platform desktop FFmpeg converter built with Tauri 2, Vue 3, and TypeScript.

License: MIT. See `LICENSE`.

The current starter already supports:

- Opening a media file and probing it with `ffprobe`
- Inspecting container, duration, bitrate, size, and stream-level metadata
- Editing conversion settings in a TypeScript-first profile model
- Saving, loading, duplicating, and deleting conversion profiles
- Running a conversion with `ffmpeg`
- Unit tests for the command builder and store behavior
- GitHub Actions scaffolding for CI and cross-platform release builds

## Why this stack

This project is a good fit for your goals:

- `Tauri 2` gives you Windows, macOS, and Linux desktop builds with small bundles.
- `Vue 3 + TypeScript` keeps most product logic in TS, which is what you want to improve at.
- `Rust` is used narrowly as the native host layer: locating binaries, probing media, persisting profiles, and running FFmpeg.

The important architectural rule in this starter is:

- Conversion planning lives in TypeScript.
- Native execution lives in Rust.

That keeps the code easier to read and test while still giving you native desktop packaging.

### Why there is Rust at all

Tauri desktop apps always have a native host process, and in Tauri that host is written in Rust.

For FreeMux, that does not mean you are building a separate backend server. Users still download and run a normal desktop app:

- Windows: installer and `.exe`
- macOS: `.app` and usually `.dmg`
- Linux: AppImage, `.deb`, or other package targets

The Vue + TypeScript side remains the main product layer. The Rust side is intentionally thin and only handles native work that the web layer cannot do by itself.

## Architecture

### Frontend

- `src/domain/`
  - Typed domain models for probe data and conversion profiles
- `src/stores/useConverterStore.ts`
  - Main app state and workflows
- `src/services/desktopClient.ts`
  - Thin Tauri bridge for dialogs and backend commands
- `src/utils/ffmpegArgs.ts`
  - Builds FFmpeg arguments from a profile
- `src/components/`
  - Inspector, profiles, options form, and command preview panels

### Backend

- `src-tauri/src/commands.rs`
  - Tauri command entrypoints
- `src-tauri/src/ffmpeg.rs`
  - Tool discovery, `ffprobe` execution, and `ffmpeg` execution
- `src-tauri/src/profiles.rs`
  - JSON-backed profile persistence
- `src-tauri/src/models.rs`
  - Rust-side request and response types

## FFmpeg and FFprobe strategy

You asked whether users need to install FFmpeg and FFprobe.

Short answer:

- For development: no, if you point the app at your local binaries or have them on `PATH`.
- For public downloads: ideally no, because you should bundle them.

This starter supports three lookup modes, in this order:

1. `FFMPEG_PATH` / `FFPROBE_PATH`
2. Bundled binaries inside the app resources
3. System-installed `ffmpeg` / `ffprobe` on `PATH`

That means you can start development quickly with a local install, then move to bundled binaries for releases.

### Bundled binary layout

Put binaries here before release builds:

```text
src-tauri/resources/bin/windows/ffmpeg.exe
src-tauri/resources/bin/windows/ffprobe.exe
src-tauri/resources/bin/macos/ffmpeg
src-tauri/resources/bin/macos/ffprobe
src-tauri/resources/bin/linux/ffmpeg
src-tauri/resources/bin/linux/ffprobe
```

These files are included in packaged apps through `src-tauri/tauri.conf.json`.

### Licensing note

Before shipping public binaries, verify the FFmpeg build and its license obligations. This repo does not include FFmpeg binaries for that reason.

## Local setup

### 1. Install system prerequisites

You need the normal Tauri prerequisites for your platform.

Official Tauri setup docs:

- https://v2.tauri.app/start/prerequisites/

On Linux, Tauri commonly needs WebKitGTK-related packages. The generator already warned about that on this machine.

### Rust toolchain note

This repo includes `rust-toolchain.toml` and expects a current stable Rust toolchain.

If your machine has an older system Rust only, without `rustup`, Tauri may fail to compile because some current transitive dependencies now require newer Rust than `1.85.0`.

Practical recommendation:

- use `rustup` and the repo toolchain file
- or install a newer stable Rust manually before running Tauri commands

### 2. Install project dependencies

```bash
npm install
```

### 3. Make FFmpeg tools available

Choose one:

#### Option A: use system binaries

Install `ffmpeg` and `ffprobe` and ensure they are on `PATH`.

#### Option B: use environment variables

```bash
export FFMPEG_PATH=/absolute/path/to/ffmpeg
export FFPROBE_PATH=/absolute/path/to/ffprobe
```

#### Option C: prepare bundled resources

Add the binaries under `src-tauri/resources/bin/<platform>/...` as shown above.

### 4. Run the desktop app

```bash
npm run tauri dev
```

## Build documentation

### Local production build

To build the frontend only:

```bash
npm run build
```

To build desktop bundles through Tauri:

```bash
npm run tauri build
```

Tauri will place build artifacts under:

```text
src-tauri/target/release/bundle/
```

Typical outputs include:

- Windows: `.msi` and/or `.exe`
- macOS: `.app` and `.dmg`
- Linux: `AppImage`, `.deb`, and sometimes `.rpm` depending on the host setup

### Important build constraint

Cross-platform desktop bundles are usually built per target OS:

- build Windows artifacts on Windows
- build macOS artifacts on macOS
- build Linux artifacts on Linux

For public releases, the usual workflow is:

1. Build locally for the platform you are on during development.
2. Use GitHub Actions to build release artifacts on Windows, macOS, and Linux runners.

### Release build checklist

Before running `npm run tauri build` for a public release, confirm:

- the Tauri prerequisites for that OS are installed
- the Rust toolchain is current and working
- `ffmpeg` and `ffprobe` are bundled in `src-tauri/resources/bin/<platform>/`
- app icons and metadata are finalized
- you have tested at least one full probe and conversion flow on that platform

### GitHub Actions release builds

This repo includes a release workflow in `.github/workflows/release.yml`.

The intended flow is:

1. Push a version tag such as `v0.1.0`
2. GitHub Actions builds FreeMux on:
- Windows
- macOS
- Linux
3. The workflow creates a draft GitHub release with attached build artifacts

Before that workflow is truly production-ready, you should still verify:

- the runner has all OS-specific Tauri prerequisites
- your FFmpeg binaries are present during the build
- signing and notarization are configured if you want polished trust prompts on macOS and Windows

## How it works

### Open and inspect a file

1. Click `Open video`
2. The app picks a file through the native file dialog
3. The frontend calls the Rust command `probe_media`
4. Rust runs `ffprobe -print_format json -show_format -show_streams`
5. The parsed result is returned to the Vue inspector panel

### Edit conversion settings

Profiles define:

- Output container
- Video codec
- Audio codec
- Video bitrate
- Audio bitrate
- CRF
- Preset
- Frame rate
- Pixel format
- Resolution mode and custom dimensions
- Extra FFmpeg arguments
- Output overwrite behavior

The command preview is generated in TypeScript from the current profile so the logic is easy to test and extend.

### Save and load profiles

Profiles are stored as JSON in the Tauri app data directory:

- Windows: inside `%AppData%` or the app-local data area Tauri resolves
- macOS: inside the user app support directory
- Linux: inside the XDG app data directory

The filename is `profiles.json`.

### Run a conversion

1. Pick an input file
2. Choose or edit a profile
3. Choose an output path
4. Click `Convert file`
5. The frontend sends the selected profile and paths to Rust
6. Rust rebuilds the FFmpeg argument list and runs the process

## Development commands

```bash
npm run tauri dev
npm run build
npm run test
```

## Testing

This starter includes:

- `src/tests/ffmpegArgs.spec.ts`
  - Verifies FFmpeg argument generation
- `src/tests/converterStore.spec.ts`
  - Verifies startup and file-selection behavior in the main store

You should keep adding tests around:

- profile validation
- command generation edge cases
- output naming rules
- future queue/progress logic

## Suggested next steps

Good next features for this repo:

1. Real-time conversion progress parsing from FFmpeg stderr
2. Queueing multiple jobs
3. Thumbnail preview and trim points
4. Validation rules per codec/container combination
5. Hardware encoder support such as `h264_nvenc`, `hevc_nvenc`, `h264_videotoolbox`, and `h264_qsv`
6. Import/export of profile files
7. Drag and drop source files

## GitHub releases

The repo includes:

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`

The release workflow is intended to build installers for:

- Windows
- macOS
- Linux

Before you rely on those releases, make sure:

- the platform build prerequisites are installed in CI
- the FFmpeg binaries are available for each target
- signing and notarization are configured later if you want polished macOS and Windows distribution

## Notes on production packaging

For a free public app, bundling FFmpeg is usually the best user experience. Users should not have to install command-line tools manually unless you explicitly want a lightweight developer-oriented app.

My recommendation for this project:

- During development, use system or env-provided binaries.
- Before public release, bundle platform-specific binaries and test each release artifact separately.
# freemux
