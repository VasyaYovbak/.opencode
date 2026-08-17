# Smart-explore CLI (Use with Bash tool)

`smart-explore <command> [args]` — structural code exploration. Cheaper than Read for code.

## Commands

| Command | Use for |
|---|---|
| `search <q> [q2 ...] [--path SUBDIR] [--file-pattern PAT] [--max-results N]` | Concepts, behavior, "where is X handled?". Not exact strings (use Grep). Auto-builds index on first run (blocks ≤90s). **Multiple queries merged + deduped** — pass all phrasings in one call. |
| `outline <file_or_dir>` | Symbol signatures with bodies folded. Cheaper than Read. |
| `unfold <file> <symbol> [<file> <symbol> ...]` | Full source of one or more functions/classes/methods. **Batch independent symbols as file/symbol pairs in one command** instead of calling unfold repeatedly. Unfold specific methods first (`unfold file.py ClassName.method_name`), not the whole class — unfolding a class dumps its entire body (check `(N lines)` span in search/outline output). Only unfold a whole class when you truly need all its methods. Qualify ambiguous symbols (`ViewLineageProcessor.__init__`, not `__init__`). |
| `callers <symbol> [--path SUBDIR] [--file-pattern PAT]` | Who calls X. |
| `callees <symbol> [--path SUBDIR] [--file-pattern PAT]` | What X calls. |
| `related <file> [--path SUBDIR]` | Import graph around a file. |
| `index [--force]` | Rebuild search index for cwd. |
| `status` | Poll index build progress for cwd. |

## Defaults — omit unless explicitly needed

- `--path` is a **subdirectory filter** (prefix match), NOT a project root. The project root is always cwd. The index lives at `<cwd>/.smart-explore-mcp-cache/`. Example: `--path src/auth/` → only results from files under `src/auth/`.
- **Do NOT pass `--path`** unless you need to narrow results to a specific subdirectory. The default searches the entire project.
- `--max-results` defaults to 20 (search) / 40 (callers/callees/related). Only override when you need more/fewer.
- `--file-pattern` defaults to none (all files). Only use to narrow by extension/dir.
- Keep commands minimal. Extra flags add tokens and reduce search scope unnecessarily.

## file-pattern format

Substring or `*.wildcard` to narrow by extension/dir. No `{brace}` expansion, no `**/glob` paths.

## Routing

- File names → `find`/`ls`. Exact text/regex → `grep`. JSON/config/markdown → `Read`.
- Concepts/behavior/unknown symbols → `search`. Call relationships → `callers`/`callees`. File structure → `outline`. One symbol body → `unfold`.
- Code reading: `outline` → batch all needed specific methods in one `unfold` command, not separate calls or whole classes. Check `(N lines)` spans — anything >200 lines is expensive to unfold.
- If `search` returns nothing: rephrase with domain terms, narrow with `--file-pattern`, rebuild `index` if stale, fall back to `grep`.
- **Batch search queries**: when you have multiple phrasings (e.g. "authorization", "auth flow", "how does auth work"), pass them all in one call: `smart-explore search "authorization" "auth flow" "how does auth work"`. Results are merged, deduplicated by chunk, and sorted by how many queries matched. Each result shows `[n/N]` match count. Saves tokens vs multiple separate calls.

## Pipes — filter output before reading

CLI output is plain text. Pipe through Unix tools to see only what you need — saves tokens vs reading full output.

```
smart-explore search "index" | grep "^📁"     # only file headers (quick overview)
smart-explore outline src/parser.ts | grep "ƒ "  # only functions
smart-explore callers parseFile | wc -l        # count callers
```

## Workflow examples

```
smart-explore search "authentication flow" "login process" "how does auth work"
smart-explore outline src/auth.ts
smart-explore unfold src/auth.ts loginHandler src/session.ts SessionStore.get
smart-explore callers parseFile
smart-explore related src/services/payment.ts
```

Batch independent calls in parallel.
