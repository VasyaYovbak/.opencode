# Codebase Memory — graph-first code exploration

On Windows, the examples below use Git Bash. In PowerShell, invoke commands as `& $env:CBM ...` and use `$env:P` instead of `$P`; in cmd.exe use `%CBM%` and `%P%`.

Use Codebase Memory (`$CBM`) first for symbol discovery, callers/callees, dependencies, and change impact. Use text search or `Read` for strings, configuration, non-code files, and code the index does not cover.

## MANDATORY RULES

1. **CBM before grep for code.** For symbols, classes, settings, and callers, start with `$CBM search_graph --name-pattern`. For strings, use `$CBM search_code`. Order for a text lookup: `search_graph` and `search_code` together, then `grep`/`rg`/`read` only if both returned nothing, and say so. Never send `grep`, `rg`, `read`, `sed`, `head`, or `cat` on source code in the same message as a CBM search, and never use them as no-op checks: wait for the CBM result first.
1a. **Find the symbol by name before guessing a QN.** Run `search_graph --name-pattern` first, then take the QN it returned for `get_code_snippet`. Build a QN by hand only when the search already gave you the exact file path and symbol name. If a QN returns `not found`, search by name instead of guessing another path.
1b. **Widen a truncated snippet, do not give up.** If `get_code_snippet` output is truncated, repeat it with `--start-line` (the `next_start_line` value it returned) or a larger `--max-lines`, instead of moving on or switching to `Read`.
2. **Project is already set.** The plugin sends a `[Codebase Memory]` message at the start of each session and sets the variable `P` to the project name. Use `"$P"` in every command. Never define `P=` yourself or paste the full project name into a command. Do not run `list_projects` or `shell_env_set` for this.
3. **No indexing on your own.** If the `[Codebase Memory]` message says there is no indexed project, do not run `index_repository`. Ask the user first.
4. **Batch independent CBM calls in one message.** Calls that do not need each other's output go out together as parallel tool calls, for example `search_graph` + `search_code`, or several `get_code_snippet` calls for different QNs. Batching applies to `$CBM` calls only; text fallbacks (`grep`, `rg`, `read`) wait for CBM results, per rule 1. Sequence only when a call needs an exact value from a previous result, such as a QN.
5. **Start narrow.** Use small limits and scoped filters: `--limit`, `--result-limit`, `--max-lines 80` or less, `--depth 1` or `2`, `--file-pattern`, `--path-filter`, `--scopes`. Widen only when the first result is not enough. Use `get_file_outline` to find symbols before reading a file.
6. **Alternation needs `--regex true` in `search_code`.** Without it, `|` is matched literally and returns 0 results. Example: `$CBM search_code --project "$P" --regex true --pattern 'A|B'`. `search_graph --name-pattern` is already a regex and needs no flag.
7. **Read is fine when CBM is not the right tool.** Use `Read` for config files, markdown, `.env`, files and line ranges outside the graph, and right before editing.

If the backend is unavailable or the scope is not indexed, continue with `Read` and `Glob`, and say so. Do not let an index problem block ordinary work.

## CLI contract (bundled upstream v0.11.0)

- `$CBM` is on `PATH` in every shell command. Invoke it directly: `$CBM search_graph ...`. Do not add `cli`, run the binary alone, or start another MCP server.
- Tool names use underscores; flags use kebab-case: `get_code_snippet --qualified-name ...`.
- Every project-scoped command requires `--project "$P"`.
- Use explicit booleans (`--include-tests true`). Repeat array flags once per item: `--paths 'a.ts' --paths 'b.ts'`. Do not pass a comma-separated list as one value.
- For complex arrays or objects, pass one raw JSON argument (snake_case keys), or `--args-file PATH`. Do not mix it with flags.
- Default output is compact `tree`. Use `--format json` only when you must parse exact names or QNs.
- The reference below is a condensed `--help` snapshot. For unlisted options, run `$CBM TOOL --help`.

## Parallel calls

- Several independent `$CBM` commands can go in one shell call. Keep the combined output small.
- Use `--max-output-tokens` on large queries when the answer does not need everything.

## Essential command help

Notation: `<...>` is required; `[...]` is optional. Repeatable flags accumulate array items.

```text
list_projects
  [--limit N (50)] [--offset N (0)] [--format tree|json]
  [--detail identity|stats (identity)]
  Lists name/root_path/branch; stats adds node/edge/database-size counts.

index_repository --repo-path <absolute-path>
  [--mode full|moderate|fast|cross-repo-intelligence (full)] [--name NAME]
  [--target-projects NAME (repeatable)] [--persistence true|false (false)]
  fast: filtered structural index; moderate: filtered + semantic;
  full: all + semantic. persistence=true writes .codebase-memory/graph.db.zst.

index_status --project <PROJECT>
  [--diagnostics none|summary|full (none)] [--format tree|json]
  Readiness and index health; diagnostics adds coverage information.

check_index_coverage --project <PROJECT>
  [--paths PATH (repeatable)] [--scopes DIRECTORY (repeatable)]
  [--diagnostics none|full (none)]
  [--path-limit N (20)] [--path-offset N (0)]
  [--scope-limit N (20)] [--scope-offset N (0)] [--format tree|json]
  Check specific repository-relative file paths or directory scopes.

search_graph --project <PROJECT>
  [--label LABEL] [--name-pattern REGEX] [--qn-pattern REGEX]
  [--file-pattern REGEX] [--query CYPHER]
  [--relationship TYPE] [--min-degree N] [--max-degree N]
  [--exclude-entry-points true|false] [--include-connected true|false]
  [--limit N (50)] [--offset N (0)] [--max-output-tokens N (3200)]
  [--format tree|json] [--fields FIELD (repeatable)] [--detail ids|default]
  Structural symbol search. Resolve returned QN and file location (see below).
  relationship/degree filters select nodes, not an edge table; no --direction flag.

search_code --project <PROJECT> --pattern <TEXT>
  [--regex true|false (false)] [--file-pattern PATTERN] [--path-filter PATH]
  [--mode compact|full|files (compact)] [--context N]
  [--result-limit N (10)] [--result-offset N (0)]
  [--raw-limit N (5)] [--raw-offset N (0)] [--source-max-lines N (20)]
  [--max-output-tokens N] [--format tree|json]
  Text search: literal by default. Pages symbol results and raw matches separately.
  Alternation (`a|b`) needs `--regex true`; without it `|` is matched literally and returns 0 results.

get_file_outline --project <PROJECT> --file-path <repo-relative-path>
  [--labels LABEL (repeatable)] [--limit N (100)] [--offset N (0)] [--format tree|json]
  List a known file's symbols before reading individual implementations.

get_code_snippet --project <PROJECT> --qualified-name <QN>
  [--source-mode auto|full|outline (auto)] [--include-neighbors true|false (false)]
  [--start-line N] [--max-lines N] [--max-output-tokens N]
  [--member-limit N (50)] [--member-offset N (0)] [--format tree|json]
  QN comes from search_graph/outline; short names can be ambiguous.
  auto outlines containers of 200+ lines; full requests implementation source.

trace_path --project <PROJECT> --function-name <exact-name-or-QN>
  [--direction inbound|outbound|both (both)] [--depth N (3)]
  [--mode calls|data_flow|cross_service (calls)] [--parameter-name NAME]
  [--edge-types TYPE (repeatable)] [--include-tests true|false (false)]
  [--risk-labels true|false (false)] [--include-evidence true|false (false)]
  [--limit N (100)] [--cursor CURSOR] [--max-output-tokens N (3200)]
  [--format tree|json]
  inbound=callers, outbound=callees, both=full context. Discover exact QN first.
  For continuation, pass returned next/next_cursor with traversal args unchanged.

query_graph --project <PROJECT> --query <CYPHER>
  [--graph code|missed (code)] [--max-rows N (200)] [--cursor CURSOR]
  [--offset N (0)] [--max-output-tokens N] [--format tree|json]
  Read graph rows/edges; missed queries the coverage-gap file tree.
  Add LIMIT inside Cypher to bound evaluation; max-rows only bounds visible rows.
  Prefer cursor paging; keep project/query/graph unchanged. Do not mix cursor/offset.

get_graph_schema --project <PROJECT>
  [--diagnostics none|full (none)] [--limit N (50)] [--offset N (0)]
  [--format tree|json]
  Discover labels, relationships, and properties before constructing Cypher.

get_architecture --project <PROJECT>
  [--path DIRECTORY_PREFIX] [--aspects ASPECT (repeatable)] [--format tree|json]
  Default: languages/packages/entry_points. --aspects overview is compact;
  other aspects include structure, dependencies, routes, hotspots, and cycles.
  Scope by path when possible; request expensive aspects only when needed.

detect_changes --project <PROJECT>
  [--scope files|impact (impact)] [--direction inbound|outbound|both (inbound)]
  [--depth N (2)] [--base-branch BRANCH (main)] [--since REF]
  [--changed-limit N (20)] [--changed-cursor CURSOR] [--changed-offset N (0)]
  [--limit N (200)] [--impact-cursor CURSOR] [--impact-offset N (0)]
  [--module-limit N (20)] [--module-cursor CURSOR] [--module-offset N (0)]
  [--max-output-tokens N (3200)] [--format tree|json]
  Map Git changes to symbols and affected callers/dependencies.
  Choose the checkout's actual base branch; do not assume every repository uses main.
  Requires valid Git commits for HEAD and the comparison ref.
```

## Qualified names with `$P`

A QN is `<project>.<dotted path>.<symbol>`. `$P` holds the `<project>` part, so you can write QNs with it directly, without pasting the project name.

- File `src/config.py`, class `ToolSettings`: `"$P.src.config.ToolSettings"`
- File `src/agent/service.py`, function `create_wms_shorts_specialist`: `"$P.src.agent.service.create_wms_shorts_specialist"`
- Slashes become dots, the `.py` extension is dropped, and the symbol name goes last.

```sh
$CBM get_code_snippet --project "$P" --qualified-name "$P.src.config.ToolSettings" --max-lines 35
$CBM trace_path --project "$P" --function-name "$P.src.agent.service.create_wms_shorts_specialist" --direction inbound --depth 2 --limit 30
```

Prefer the QN that `search_graph` returned. Build one with `$P` only when you already know the file path and symbol name.

## Recipes

Each step depends on the previous result. Replace `<...>` with values returned earlier; never run placeholder QNs.

### Find a symbol, read it, then inspect callers

```sh
$CBM search_graph --project "$P" --name-pattern '.*[Hh]andler.*' --limit 10 --format json
$CBM get_code_snippet --project "$P" --qualified-name '<QN from search>' --source-mode full --max-lines 100
$CBM trace_path --project "$P" --function-name '<same QN>' --direction inbound --depth 2 --limit 30
```

Use `--direction outbound` for dependencies, `both` for both sides, `--include-tests true` for test callers.

### Start from a known file

```sh
$CBM check_index_coverage --project "$P" --paths 'src/auth.ts'
$CBM get_file_outline --project "$P" --file-path 'src/auth.ts' --limit 30
$CBM get_code_snippet --project "$P" --qualified-name '<QN from outline>' --max-lines 80
```

If coverage is missing or the outline is empty, read the file directly.

### Find behavior when the symbol name is unknown

```sh
$CBM search_code --project "$P" --pattern 'Authorization' --path-filter 'src' --result-limit 10 --raw-limit 5
$CBM get_code_snippet --project "$P" --qualified-name '<QN from text search>' --max-lines 80
```

If a hit is not tied to an indexed symbol, use `Read` at its file and line instead of inventing a QN.

### Assess a patch's impact

```sh
$CBM detect_changes --project "$P" --scope impact --base-branch '<actual base branch>' --depth 2 --limit 30
$CBM trace_path --project "$P" --function-name '<changed symbol QN>' --direction inbound --depth 2 --include-tests true --limit 30
```

Read affected callers and existing tests before choosing what to change or test. Follow returned cursors if a section is incomplete.

### Inspect edges or degree with Cypher

After `get_graph_schema` confirms the labels, properties, and edge types:

```sh
$CBM query_graph --project "$P" --query 'MATCH (caller:Function)-[:CALLS]->(f:Function) RETURN f.qualified_name, count(caller) AS callers ORDER BY callers DESC LIMIT 20'
```

For cross-service traversal use `trace_path --mode cross_service --direction both`; outbound-only traversal misses remote callers. Disconnected non-entry-point nodes (`search_graph --max-degree 0 --exclude-entry-points true`) are **dead-code candidates**, not proof that deletion is safe.

## Absence claims and evidence

- Before saying a symbol, caller, or dependency does not exist, run `check_index_coverage` for the relevant paths and confirm with source search. Empty graph results are not proof of absence; static analysis misses dynamic dispatch and runtime wiring.
- `has_more`, returned cursors, and truncation notices mean the result is incomplete. Do not treat the first page as exhaustive.
- Compact output may abbreviate names with prefix references. In `search_graph` JSON, use `cols` to find `name` in `groups[].rows[]`, then rebuild the QN as `qn_prefix + "." + name` (or just `name` if the prefix is empty), following `qn_rule`. The file path is `groups[].file`. Do not assume a `qualified_name` field exists.
- `query_graph` JSON uses `columns`/`rows`; counts can be strings. Convert before comparing.
- Graph edges are indexed evidence, not full runtime behavior. Use `--include-evidence true` when resolver confidence matters. Use `get_graph_schema` as the authority for edge names.

## Other tools

The bundled CLI exposes 17 tools: the 13 documented above plus `compare_graphs`, `manage_adr`, `ingest_traces`, and `delete_project`. There is no `explore_search` in upstream v0.11.0. Never delete an index or mutate ADRs or trace data unless the user asked for it.
