# Smart-explore routing

Pick the cheapest tool that directly answers the query. Do not default to `smart_search` for exact matches.

| Query type | Tool |
|---|---|
| File names / path patterns | `Glob` |
| Exact text, regex, TODOs, error strings, imports | `Grep` |
| Concepts, behavior, "where is X handled?", unknown symbols | `smart_search` |
| "Who calls X?" / "What does X call?" | `smart_callers` / `smart_callees` |
| File/dir structure without full source | `smart_outline` |
| One function/class/method body | `smart_unfold` |
| JSON, markdown, lock files | `Read` |

## Workflows

- **Concept/behavior**: `smart_search` → `smart_outline` → `smart_unfold`
- **Exact symbol**: `Grep` first; if noisy and relational, switch to `smart_callers` / `smart_callees` / `smart_search`
- **Call graph**: prefer `smart_callers` / `smart_callees` / `smart_related_files` over grepping symbol names
- **Code reading**: `smart_outline` → `smart_unfold` specific methods, not whole classes. Check `(N lines)` spans in output — anything >200 lines is expensive. Unfold a whole class only when you truly need all its methods.

## Fallback

If `smart_search` returns nothing or low-confidence:
1. Rephrase with domain/behavior terms
2. Narrow with `file_pattern`
3. Rebuild index if stale
4. Fall back to `Grep` / `Glob`

If the user gave an exact string, do not retry semantic variants — use `Grep`.

## Token efficiency

- `smart_unfold` specific methods (`ClassName.method_name`) over whole classes — unfolding a class dumps its entire body
- `smart_callers` / `smart_callees` over grepping for usage questions
- Batch independent searches in parallel
- `Read` for prose only, not code navigation
