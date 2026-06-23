## 1. Route by query type, not by one fixed rule

Choose the **cheapest tool that can directly answer the question**.

- **`Glob`**: file names and path patterns only (`*.test.ts`, `src/**/auth*`).
- **`Grep`**: exact text, exact symbol spelling, regex, TODOs, error strings, imports.
- **`smart_explore_smart_search`**: concepts, behavior, intent, unknown symbol names, "where is X handled?".
- **`smart_explore_smart_callers` / `smart_explore_smart_callees`**: relationship questions such as "who calls this?" or "what does this call?".
- **`smart_explore_smart_outline`**: inspect a file or directory structure without reading full source.
- **`smart_explore_smart_unfold`**: read one exact function, class, or method body.
- **`Read`**: JSON, markdown, config, lock files, and very small code files.

Do **not** force `smart_explore_smart_search` as the first step when the user already gave an exact string, exact symbol, or file pattern. Use `Grep` or `Glob` first in those cases.

## 2. Preferred workflows

### Unknown behavior or concept

Use this path for questions like "How does auth work?" or "Where do we validate invoices?".

```
smart_explore_smart_search(query="authentication flow")
→ smart_explore_smart_outline(file_path="...")
→ smart_explore_smart_unfold(file_path, symbol_name)
```

### Exact text or exact symbol

Use this path for questions like "Find `PaymentService` imports" or "Search for `TODO(api)`".

```
Grep("PaymentService")
```

If the grep results are noisy and the task is really relational, switch to `smart_explore_smart_callers` / `smart_explore_smart_callees` or `smart_explore_smart_search`.

### Call graph or dependency questions

Prefer graph tools over text matches.

- "Who calls `parseFile`?" → `smart_explore_smart_callers(symbol_name="parseFile")`
- "What does `parseFile` call?" → `smart_explore_smart_callees(symbol_name="parseFile")`
- "What files are around this module?" → `smart_explore_smart_related_files(file_path="...")`

### File inspection

For code files, prefer structure-first reading:

```
smart_explore_smart_outline(file_path="src/foo.ts")
→ smart_explore_smart_unfold(file_path="src/foo.ts", symbol_name="targetFunction")
```

Avoid full-file reads when outline/unfold can answer the question.

## 3. Fallback order when smart-explore is weak

If `smart_explore_smart_search` returns nothing or low-confidence results:

1. Rephrase the query using behavior or domain terms.
2. Narrow with `file_pattern` when you know the language or directory.
3. If indexing is missing or stale, rebuild the index.
4. Fall back to `Grep` for exact tokens or `Glob` for candidate files.

Do not keep retrying the same semantic query with tiny wording changes if the user clearly provided an exact string; switch to `Grep`.

## 4. Token-efficiency rules

- Prefer `smart_explore_smart_outline` + `smart_explore_smart_unfold` over reading whole code files.
- Prefer `smart_explore_smart_callers` / `smart_explore_smart_callees` over grepping symbol names for usage questions.
- Batch independent searches in parallel.
- Use `Read` for prose/config data, not for large code navigation.
- Treat smart-explore as the default for **semantic, structural, and graph** questions, not for every search question.

## 5. Prompting guidance for the agent

Good instructions are short decision policies, not absolute slogans.

Use wording like:

- "Route by query type: exact text -> `Grep`, path lookup -> `Glob`, concept/behavior -> `smart_explore_smart_search`, call relationships -> callers/callees, exact symbol body -> outline then unfold."
- "Start with the lowest-cost tool likely to answer correctly; escalate only when needed."
- "Use smart-explore to narrow the search space before reading source."

Avoid wording like "always use semantic search first". That creates bad behavior on exact-match tasks and fights the model's built-in tool-selection heuristics.