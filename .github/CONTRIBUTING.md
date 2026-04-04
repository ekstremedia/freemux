# Contributing to FreeMux

## Development setup

1. Install the Tauri prerequisites for your OS.
2. Install a current stable Rust toolchain.
3. Run `npm install`.
4. Make `ffmpeg` and `ffprobe` available through bundled binaries, environment variables, or `PATH`.
5. Start the app with `npm run tauri dev`.

## Before opening a pull request

- Keep changes focused.
- Add or update tests when behavior changes.
- Run:

```bash
npm run test
npm run build
```

## Coding expectations

- Keep the TypeScript side as the main product layer.
- Keep the Rust side thin and native-focused.
- Prefer readable code over clever code.
- Add comments only where they explain non-obvious behavior.
