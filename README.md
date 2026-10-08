# OpenCode Personal Plugin Suite

A small OpenCode V2 plugin package bundling three local features:

- **Codebase Memory (CBM):** starts the CBM daemon and exposes a fast CLI-compatible `CBM` client to new shell sessions.
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

In shell sessions, `CBM` names the bundled `opencode-cbm` wrapper on `PATH`. Use `$CBM list_projects`
in either bash or zsh without word-splitting workarounds; paths and arguments containing spaces are preserved.

### Persistent CLI bridge

By default, `$CBM` uses a small Node.js client to send commands over an owner-only Unix socket to the plugin.
The plugin starts CBM in stdio MCP mode on the first call and keeps the initialized frontend for later calls.
No new CBM process or initialization is needed for each tool invocation. The fast client requires Node.js 18+;
if `node` is missing from `PATH`, the wrapper uses the original native CLI. No additional npm dependency is required.

The bridge supports kebab-case flags (including repeated array flags), inline JSON, JSON on stdin,
`--args-file` relative to the caller's directory, tool help, `--format json`, and outer `--json`/`--quiet`.
Stdout remains the tool result and failures return a nonzero exit code. Explicit `--progress` or `--verbose`
requests use the native CLI to retain its diagnostics.

Sessions are scoped to the caller's working directory. Calls in one directory are serialized; at most eight
frontends are retained, with idle ones evicted as needed. A crashed frontend is recreated on the next call.
These are standard CBM MCP sessions and honor its configured background indexing/watch settings.
Disconnected/timed-out requests are cancelled and are **never automatically replayed**, including mutations.
The socket and frontends are cleaned up when the plugin unloads. The underlying shared CBM daemon is not stopped.

- Set `CBM_BRIDGE=0` in the OpenCode server environment to disable the bridge.
- Use `CBM_DIRECT=1 $CBM list_projects` to bypass it for one invocation.
- `CBM_TIMEOUT_MS` sets the MCP tool request timeout (default 600000 ms); startup has a separate 30000 ms timeout.
- Per-command overrides of the binary, allowed root, cache, runtime directory, log level, or memory budget
  use the native CLI rather than reusing a session with different settings.
- If the socket is missing or cannot be connected before a request is sent, the wrapper falls back to native CLI.
  Once a request has been sent, a transport failure is reported rather than risking a duplicate operation.

If CBM initialization fails, the plugin logs the cause and still registers the OpenAI Flex models.

Run `npm install` and `npm run typecheck` to install dependencies and check the plugin sources.
