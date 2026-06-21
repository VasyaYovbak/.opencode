# Post-Edit Checks Plugin

Runs fast pre-commit-style checks **automatically** after OpenCode edits a file.
Failures are surfaced two ways:

- **To the LLM** — appended to the tool result so it sees the issue and fixes it
  on the next turn (no manual `pre-commit run` round-trip).
- **To you** — rendered as styled error entries in the OpenCode TUI right below
  the diff (location, check name, message).

Auto-loaded from `.opencode/plugins/`. No config required.

## Checks performed

| File type             | Check                       | Tool                      | What it catches                                  |
| --------------------- | --------------------------- | ------------------------- | ------------------------------------------------ |
| `.py`, `.pyi`         | `ruff-check`                | `ruff check`              | Lint errors, unused imports, style violations    |
| `.py`, `.pyi`         | `ruff-format`               | `ruff format --check`     | Formatting issues (would-reformat)               |
| `.py`, `.pyi`         | `mypy`                      | `dmypy` (mypy daemon)     | Strict type errors (only in mypy-tracked dirs)   |
| `.yaml`, `.yml`       | `check-yaml`                | `python3` + `pyyaml`      | YAML syntax errors                               |
| `.json`               | `check-json`                | `JSON.parse` (pure JS)    | JSON syntax errors                               |
| any text file         | `end-of-file`               | pure JS                   | Missing trailing newline                         |
| any file              | `check-added-large-files`   | pure JS (`statSync`)      | Files larger than 5 MB                           |

All checks mirror hooks from `.pre-commit-config.yaml` so what passes here
will pass `pre-commit run` too.

### What's deliberately skipped

These pre-commit hooks are **not** mirrored (too slow or repo-wide):
`pytest`, `bandit`, `detect-secrets`, `uv-lock`. Run `pre-commit run --all-files`
before committing to cover them.

## Performance

Designed to add minimal latency to file edits:

- **Ruff** — single batched invocation per edit (one process for all `.py` files).
- **YAML** — single `python3` invocation for all `.yaml` files.
- **JSON / newline / large-file** — pure JavaScript, no subprocess.
- **All subprocess checks** — run concurrently via `Promise.all`.
- **dmypy daemon** — warmed up at OpenCode startup (background, fire-and-forget).
  Cold start is ~16s but happens once while you write your first prompt.
  Subsequent type-checks are ~0.5s incremental.

Typical post-edit overhead on a Python file: **< 1 second**.

## How mypy directories are detected

The plugin reads `.pre-commit-config.yaml` at startup and looks for hooks whose
`id` starts with `mypy-`. It extracts the target directory from the hook's
`entry` line (the argument after `--ignore-missing-imports`).

For this repo that resolves to: `agent/`, `wms_mcp/`, `gym/`.

mypy only runs when you edit a `.py` file **inside** one of those dirs.
Edits outside them skip the type-check step entirely.

## Where errors appear

### In the TUI (you)
After an `edit`/`write`/`patch` that triggers failures, the diff is followed by:

```
Error [12:5] [ruff-check] F401 'os' imported but unused
Error [—] [end-of-file] file does not end with a newline
```

Up to 3 errors per file are shown (TUI cap).

### In the tool result (LLM)
The LLM sees a block like:

```
⚠️  post-edit-checks: 2 issue(s) found — please fix before continuing.

• [ruff-check] agent/foo.py:12:5
  F401 'os' imported but unused
• [end-of-file] agent/foo.py
  file does not end with a newline
```

It will typically fix the issues on its next action without being prompted.

## Logs

Plugin activity is logged under `service=post-edit-checks`:

```bash
tail -f ~/.local/share/opencode/log/*.log | grep post-edit-checks
```

Expected entries:
- `info` — `dmypy daemon warmed up` (once, at startup)
- `warn` — `post-edit-checks: N failure(s) after edit` (per failing edit)
- `error` — only on plugin bugs (unexpected exceptions)

## Files

- `post-edit-checks.ts` — the plugin (TypeScript, default-exports a `Plugin`)
- `../tsconfig.json` — typecheck config (`tsc -p .opencode/tsconfig.json`)
- `../package.json` — pins `@opencode-ai/plugin` and `@types/node`

## Modifying the plugin

After editing `post-edit-checks.ts`, **restart OpenCode** for changes to take
effect (plugins load once at startup).

To typecheck without running:

```bash
cd .opencode && npx tsc --noEmit
```

## Troubleshooting

**Plugin doesn't run.** Check it's not listed in `opencode.json`'s `plugin`
array — that field is for npm-published packages and will fail to resolve a
local filename. Local plugins in `.opencode/plugins/` auto-load.

**mypy never runs.** Confirm `.venv/bin/dmypy` exists and that
`.pre-commit-config.yaml` has hooks with `id: mypy-<something>`. Check the log
for the `dmypy daemon warmed up` info line.

**Tool not installed.** If `ruff`, `python3`, or `dmypy` isn't on PATH, the
corresponding check is silently skipped — other checks still run.
