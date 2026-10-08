# Codebase Memory — graph-first code exploration

Use Codebase Memory first for symbol discovery, callers/callees, dependencies, architecture, and change impact. Narrow with the graph, then read the relevant source. Use text search for strings, configuration, and code the index does not cover; do not dump the whole repository to answer a structural question.

## CLI contract (bundled upstream v0.11.0)

- `$CBM` is injected into every shell command as the name of a CLI-compatible client on `PATH`. It reuses a persistent MCP session, or adds `cli` internally when falling back to the native executable. Invoke it directly in bash or zsh: `$CBM search_graph ...`. Do not append another `cli`, run the binary without a subcommand, or start another MCP stdio server.
- Tool names use underscores; flags use kebab-case: `get_code_snippet --qualified-name ...`.
- Every project-scoped command requires `--project`. First run `$CBM list_projects`; choose the returned `name` whose `root_path` matches the checkout being investigated. Do not guess the project name from a directory basename or reuse another checkout's index.
- In examples, `PROJECT` is that exact returned name; `REPO` is the checkout's absolute path. Set variables within each shell call or substitute literal values: assignments do not necessarily persist between tool calls.
- Use explicit boolean values (`--include-tests true`). For array flags, repeat the flag once per item: `--paths 'src/auth.ts' --paths 'src/user.ts'`. **Do not pass a JSON array or comma-separated list as one flag value**: it becomes one literal string item. Quote regexes, paths, qualified names, and Cypher queries.
- For complex arrays/objects, pass one raw JSON argument instead of flags, e.g. `$CBM check_index_coverage '{"project":"<selected name>","paths":["src/auth.ts","src/user.ts"]}'`, or use `--args-file PATH` with a JSON file. JSON keys use snake_case; do not mix the raw JSON argument with flag-style tool arguments.
- Default output is compact `tree`. Use `--format json` when exact names or machine parsing are needed. This differs from `$CBM --json TOOL ...`, which returns the raw MCP envelope.
- The reference below is a condensed `--help` snapshot, not a list of every optional flag. Start with it; request `$CBM TOOL --help` only for unlisted options or an overridden binary with a different version.

## First use in a checkout

1. `$CBM list_projects` — match `root_path`; follow `has_more` with `--offset` if needed. Reuse this identity during the task, rather than listing projects before every search.
2. `$CBM index_status --project "$PROJECT"` — check index readiness. An indexing request being accepted does not mean the graph is ready.
3. If missing, index the task's checkout: `$CBM index_repository --repo-path "$REPO" --mode fast`. Use the returned project name, then check `index_status`. Do not blindly rebuild an existing index or delete projects to fix a search.
4. For unfamiliar structure, use `get_architecture`; before writing Cypher, use `get_graph_schema` to discover actual labels, relationships, and properties.
5. Before concluding that a symbol, caller, or dependency does not exist, run `check_index_coverage` for the relevant files/directories and verify with source search. Empty graph results are not proof of absence; static analysis can miss dynamic dispatch and runtime relationships.

If the backend is unavailable or the scope is unindexed, continue with targeted Read/Grep/Glob and state the limitation. Do not let an index problem block ordinary code work.

## Essential command help

Notation: `<...>` is required; `[...]` is optional. All commands below start with `$CBM`. Defaults are noted where useful; repeatable flags accumulate array items.

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

## Ready-to-use search recipes

These are ordered steps: inspect each result before choosing the next command. Replace example names/paths and `<...>` placeholders with values returned by earlier steps; never execute placeholder QNs literally.

### Find a symbol, read it, then inspect callers

```sh
# After list_projects and index_status; define PROJECT in this shell call.
PROJECT='<name returned by list_projects>'
$CBM search_graph --project "$PROJECT" --name-pattern '.*[Hh]andler.*' --limit 10 --format json
# Select the relevant QN and file; grouped JSON requires QN reconstruction below.
$CBM get_code_snippet --project "$PROJECT" --qualified-name '<exact QN from search>' --source-mode full --max-lines 100
$CBM trace_path --project "$PROJECT" --function-name '<same exact QN>' --direction inbound --depth 2 --limit 30
```

Use `--direction outbound` for dependencies, `both` for both sides, or `--include-tests true` when finding test callers. Start with depth 1–2 and small limits; expand only when needed.

### Start from a known file

```sh
PROJECT='<selected project name>'
$CBM check_index_coverage --project "$PROJECT" --paths 'src/auth.ts'
$CBM get_file_outline --project "$PROJECT" --file-path 'src/auth.ts' --limit 30
$CBM get_code_snippet --project "$PROJECT" --qualified-name '<QN chosen from outline>' --max-lines 80
```

If coverage is missing or the outline is empty, read the file directly. For a directory, use `--scopes 'src/auth'` instead of enumerating all files.

### Find behavior when the symbol name is unknown

```sh
PROJECT='<selected project name>'
$CBM search_code --project "$PROJECT" --pattern 'Authorization' --path-filter 'src' --result-limit 10 --raw-limit 5
# Follow the returned symbol QN or file/line location; inspect implementation.
$CBM get_code_snippet --project "$PROJECT" --qualified-name '<QN from text search>' --max-lines 80
# If nothing matches, check coverage before a broader source-text search.
$CBM check_index_coverage --project "$PROJECT" --scopes 'src'
```

Use `--regex true` only for an actual regex. If a text hit is not associated with an indexed symbol, use Read at its file/line rather than inventing a QN.

### Assess a patch's impact

```sh
PROJECT='<selected project name>'
$CBM detect_changes --project "$PROJECT" --scope impact --base-branch '<actual base branch>' --depth 2 --limit 30
# For a changed symbol requiring deeper investigation:
$CBM trace_path --project "$PROJECT" --function-name '<changed symbol QN>' --direction inbound --depth 2 --include-tests true --limit 30
```

Read affected callers and existing tests before choosing what to change/test. Follow returned changed/impact/module cursors independently if the relevant section is incomplete.

### Inspect actual edges or directed degree with Cypher

After `get_graph_schema` confirms these labels/properties/edge types:

```sh
PROJECT='<selected project name>'
$CBM get_graph_schema --project "$PROJECT"
$CBM query_graph --project "$PROJECT" --query 'MATCH (a)-[r:HTTP_CALLS]->(b) RETURN a.name, b.name, r.url_path, r.confidence LIMIT 20'
# Highest CALLS fan-in (callers per function):
$CBM query_graph --project "$PROJECT" --query 'MATCH (caller:Function)-[:CALLS]->(f:Function) RETURN f.qualified_name, count(caller) AS callers ORDER BY callers DESC LIMIT 20'
# Highest CALLS fan-out (callees per function):
$CBM query_graph --project "$PROJECT" --query 'MATCH (f:Function)-[:CALLS]->(callee:Function) RETURN f.qualified_name, count(callee) AS callees ORDER BY callees DESC LIMIT 20'
```

For cross-service traversal use `trace_path --mode cross_service --direction both`. Outbound-only traversal will not show remote callers. Disconnected non-entry-point nodes (`search_graph --max-degree 0 --exclude-entry-points true`) are **dead-code candidates**, not proof that deletion is safe.

## Output and evidence discipline

- `has_more`, returned cursors, and truncation/budget notices mean the result is incomplete. Do not silently treat the first page as exhaustive. `search_graph` uses limit/offset; `trace_path` uses cursor; other tools may page multiple sections independently.
- Compact tree output may abbreviate names with prefix references; resolve them before reuse. JSON can also be grouped, not a flat list of nodes: in `search_graph`, use `cols` to locate `name` in each `groups[].rows[]`, then reconstruct QN as `qn_prefix + "." + name` (or just `name` if the prefix is empty), following the returned `qn_rule`. The file path is `groups[].file`. Do not assume every JSON result has a `qualified_name` field.
- `query_graph` JSON uses `columns`/`rows`; table cells can be strings even for counts. Convert numeric strings before calculating or comparing them in scripts.
- Treat graph edges as indexed evidence, not a guarantee of complete runtime behavior. Use `--include-evidence true` for resolver/confidence details when the distinction matters; verify relevant source before editing or making an absence claim.
- Use `get_graph_schema` as the authority for available edges/properties, not a hardcoded list carried over from another version. Common edges include CALLS, IMPORTS, HTTP_CALLS, ASYNC_CALLS, and DATA_FLOWS.

For example, `cols: ["name", "label", "lines", "in", "out"]` with `qn_prefix: "my-project.src.auth"`, `file: "src/auth.ts"`, and row `["authHandler", "Function", "10-20", 1, 2]` identifies `my-project.src.auth.authHandler`. Pass that full QN to `get_code_snippet` or `trace_path`, not just the prefix or the row array.

## Other tools (request help when needed)

The bundled CLI exposes 17 tools: the 13 documented above plus `compare_graphs`, `manage_adr`, `ingest_traces`, and `delete_project`. There is no `explore_search` in upstream v0.11.0. Never delete an index or mutate ADRs/trace data unless the user requested that work.
