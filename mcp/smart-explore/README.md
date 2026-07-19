# smart-explore MCP server

Token-optimized structural code search for OpenCode, powered by tree-sitter AST parsing.
Originally built as a Claude Code plugin (`claude-mem`); ported to OpenCode by
re-using the existing MCP server and adapting the skill format.

## What it provides

Six MCP tools, exposed under the `smart-explore_` prefix:

| Tool                          | Purpose                                                 | Token cost |
| ----------------------------- | ------------------------------------------------------- | ---------- |
| `smart-explore_smart_search`  | Symbol search across a directory (folded views)         | ~2-6k      |
| `smart-explore_smart_outline` | Structural skeleton of a file or directory              | ~1-2k      |
| `smart-explore_smart_unfold`  | Full source of one named symbol from a file             | ~400-2.1k  |
| `smart-explore_smart_callers` | Incoming call edges for one symbol                      | ~1-3k      |
| `smart-explore_smart_callees` | Outgoing call edges from one symbol                     | ~1-3k      |
| `smart-explore_smart_related_files` | Import/test graph around one file                 | ~1-2k      |

These replace the typical `Glob → Grep → Read` discovery cycle when you want to
**explore** code structure rather than read full files.

`smart-explore_smart_search` can exclude subdirectories before scanning via
relative `exclude_paths` (or the alias `exclude_dirs`).
BM25 keeps normal English stemming for source content and uses n-gram matching
for symbol names and signatures, so identifier fragments such as `cache` match
`cacheResult` without changing the source shown in results.
Use CLI flag `--show-scores` or MCP argument `include_scores: true` to include
mode-specific BM25, RRF, or vector-distance values in search output.
`smart-explore_smart_outline` also accepts a directory and returns the same
file-level outline format concatenated for discovered files, with a built-in
safety cap for very large directories.

Caller/callee analysis caches parsed relations until a source file is added,
removed, or its size/mtime changes. Declarations and scopes come from
Tree-sitter; call sites still use a lightweight regex. Named imports,
namespace-qualified calls, and same-file symbols are resolved before unique
project-wide names. Dynamic dispatch, computed properties, and ambiguous
duplicate names remain unresolved rather than being attributed arbitrarily.

## Layout

```
.opencode/mcp/smart-explore/
├── scripts/
│   ├── bootstrap-mcp.cjs    ← dependency installer
│   └── mcp-server.cjs       ← bundled server (entry point)
├── src/                     ← TypeScript source (parser, search, server)
├── node_modules/            ← tree-sitter native bindings (gitignored)
├── package.json
└── tsconfig.json
```

The companion skills live in `.agents/skills/`:
- `smart-explore/SKILL.md` — when & how to call the tools
- `make-plan/SKILL.md` — phased implementation planner
- `do/SKILL.md` — orchestration protocol for executing plans with subagents

## How it's wired in

`.opencode/opencode.json`:

```jsonc
"mcp": {
  "smart-explore": {
    "type": "local",
    "command": ["pnpm", "run", "smart-explore-mcp"],
    "enabled": true
  }
}
```

OpenCode spawns the server as a stdio subprocess. The MCP protocol handshake
registers the tools; the LLM sees them as `smart-explore_smart_search`,
etc. (server name + `_` + tool name).

## Setup

Run the root `.opencode` installer before starting OpenCode:

```bash
./.opencode/install.sh
```

On Windows:

```bat
.\.opencode\install.bat
```

If you only want to install this MCP package directly:

```bash
cd .opencode/mcp/smart-explore
pnpm install --frozen-lockfile
pnpm run build
```

After install/build, the MCP server can be launched through the package binary:

```bash
pnpm run smart-explore-mcp
```

For npm-based environments, use the same package script:

```bash
npm run smart-explore-mcp
```

If the package is installed globally or published to a registry, its `bin` entry
also exposes the executable as `smart-explore-mcp`.

`node_modules/` is still **required** at runtime (~666 MB — tree-sitter grammars
are native bindings that can't be bundled by esbuild), so the install step must
be run on each fresh clone.

This package uses `pnpm` because the current tree-sitter grammar set has
incompatible optional peer ranges under newer npm versions.

If you want to install it manually without the root script:

```bash
cd .opencode/mcp/smart-explore
pnpm install --frozen-lockfile
pnpm run build
```

If you change anything under `src/`, rebuild the bundle:

```bash
pnpm run build
```

This regenerates `scripts/mcp-server.cjs`. Restart OpenCode after rebuilding.

## Verifying it works

1. Run the `.opencode` install script.
2. Restart OpenCode.
2. Check the log for:
   ```
   service=mcp key=smart-explore mcp stderr: [mcp-server] smart-explore vX.Y.Z ready
   service=mcp key=smart-explore toolCount=3 create() successfully created client
   ```
3. Ask OpenCode to use the tools:
   ```
   Run smart-explore_smart_outline on agent/main.py
   ```
4. The TUI should show a folded structural view in the tool-result panel.

## Troubleshooting

**`MCP server bundle missing`** in log
The committed bundle is missing. Rebuild it with `npm run build` inside
`.opencode/mcp/smart-explore/`.

**`node_modules missing`** in log
Run `./.opencode/install.sh` or `node scripts/bootstrap-mcp.cjs` inside
`.opencode/mcp/smart-explore/`.

**Tools don't appear in OpenCode**
Check `mcp.smart-explore.enabled: true` in `opencode.json` and restart.

**Tools fail with "Cannot find module 'tree-sitter-X'"**
The install may be incomplete or built for the wrong architecture. Re-run `npm ci`
inside `.opencode/mcp/smart-explore/`.

## Supported languages

JavaScript / TypeScript / TSX / JSX / Python / Go / Rust / Ruby / Java / C / C++.
Files with unrecognized extensions fall back to plain-text grep-style search
(`smart-explore_smart_search` still works; `smart-explore_smart_outline` does not).

Custom grammars can be added via `.claude-mem.json` at project root — see the
`smart-explore` skill for the syntax.

## Differences from the original Claude Code plugin

- `.mcp.json` (Claude Code config) replaced with `mcp.smart-explore` entry in
  `opencode.json`. `${CLAUDE_PLUGIN_ROOT}` env var → relative project path.
- Skills moved from `claude-mem/skills/` → `.agents/skills/` (OpenCode discovery
  location). Tool references in `smart-explore` skill updated from
  `smart_search` to `smart-explore_smart_search` (OpenCode prefixes MCP tools
  with the server name).
- Removed Claude-Code-specific files: `.claude-plugin/`, `.mcp.json`, and the
  `ui/` viewer (used by claude-mem's memory snapshot browser, not the search MCP).
- Server source code (`src/`, `scripts/build.js`, parser logic) is unchanged.
