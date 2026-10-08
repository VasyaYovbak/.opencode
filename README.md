# OpenCode Personal Plugin Suite

A small OpenCode V2 plugin package bundling three local features:

- **Codebase Memory (CBM):** starts the CBM daemon and exposes `CBM` to new shell sessions.
- **OpenAI Flex models:** registers the local Flex model definitions and pricing.
- **Token Speed Metrics:** adds token usage, prompt/generation speed, and TTFT to the TUI sidebar.

There is no DashOps provider in this package.

## Layout

- `src/index.ts` is the server plugin entry point and composes the server-side feature modules.
- `src/plugins/codebase-memory/` owns CBM daemon startup and shell environment setup.
- `src/plugins/openai-flex-models/` owns Flex model data and provider registration.
- `src/plugins/token-speed-metrics/` owns the TUI entry point, metrics calculations, and event state.
- Token Speed Metrics uses the separate `@opencode/plugin/tui` API.
- `package.json` exports both `.` and `./tui`, so OpenCode can load the server and TUI parts from this package.

## Install locally

Install dependencies in this directory, then add the package path to the `plugins` list in the global
`~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/home/vasyl/repos/opencode-plugin-suite"],
}
```

The CLI loads the TUI entry point from the same package; it does not also need to be listed in `cli.json`.
Alternatively, place or symlink this directory under `~/.config/opencode/plugins/` for global plugin discovery.

## CBM settings

Codebase Memory v0.11.0 is bundled for Linux x64, macOS Apple Silicon (arm64), and macOS Intel (x64).
The plugin selects the archive using the OpenCode server's OS and architecture, verifies the archive and
executable SHA-256 checksums, and checks the version before using a platform-specific runtime directory.
No separate CBM installation or runtime download is needed on these platforms.

Set `CBM_BINARY` in the OpenCode **server environment** to use a different executable or support another
platform. This override bypasses the bundled checksum and version checks, so verify the executable yourself
(`codebase-memory-mcp --version` should print `codebase-memory-mcp 0.11.0`).
`CBM_LOG_LEVEL` is forwarded to shell sessions and defaults to `error`.

If CBM initialization fails, the plugin logs the cause and still registers the OpenAI Flex models.

Run `npm install` and `npm run typecheck` to install dependencies and check the plugin sources.
