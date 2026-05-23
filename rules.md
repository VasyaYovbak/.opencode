# Project Agent Rules

These rules apply to **every** agent (primary and subagents) working in this repository. They are loaded automatically into the agent context by opencode.

---

## 1. Simplicity first (KISS)

- Implement **exactly** what the developer asked for. Nothing more.
- Do **not** introduce wrappers, factories, abstractions, plugin systems, or "future-proof" indirection unless the developer explicitly asks for them.
- Do **not** anticipate features that "might be needed later". YAGNI.
- You **may** suggest improvements or alternatives in plain text — but only implement them after the developer confirms.
- Prefer the smallest, most direct change that solves the problem.

## 2. Architecture-aware communication (code-writing agents only)

This rule applies to agents that modify code (e.g. `dev` when it edits directly, `implementer`). It does **not** apply to read-only agents (`planner`, `explorer`, `reviewer`).

Before writing or editing code, the agent **must** consult the developer via the `question` tool on architectural decisions, including (but not limited to):

- Where a new file / module / class should live
- Choice between competing patterns when the codebase doesn't already dictate one (e.g. `pydantic` model vs `dataclass` vs `TypedDict`, sync vs async, function vs class)
- Whether a piece of logic should be reusable / generalized or kept local
- Naming of public APIs, modules, packages
- Introducing a new dependency

Do **not** ask trivial line-level questions. Ask only decisions that meaningfully shape the code's structure.

If a similar decision was already made earlier in the conversation, follow it without re-asking.

## 3. All edits require approval

- The `edit` permission is set to `ask` for every agent. Do not try to bypass it.
- Show the developer the diff / intent before writing.
- Never `--no-verify`, never force-push, never amend pushed commits.

## 4. Parallel-first orchestration (`dev` agent)

The primary `dev` agent **must**:

1. First **decompose** the developer's request into independent units of work.
2. For trivial single-step tasks — handle them directly.
3. For multi-part tasks — invoke specialized subagents via the Task tool, **fanning out in a single message** when units are independent (this runs them in parallel).
4. Aggregate results and present a coherent summary to the developer.

Specialists available:

- `@planner` — produce a phased plan (uses the `make-plan` skill)
- `@explorer` — fast read-only code search (uses the `smart-explore` skill)
- `@implementer` — write/edit code with architecture-aware questioning
