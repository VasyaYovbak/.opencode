import type { Plugin } from "@opencode-ai/plugin"

const READ_MENTIONS: Record<string, Array<[string, string]>> = {
  bash: [
    [
      "You can use Read with offset/limit to read specific sections or Grep to search the full content.",
      "You can use Grep to search full content, Read with offset/limit for specific sections, or smart-explore MCP tools for structural code exploration.",
    ],
    [
      "- Read files: Use Read (NOT cat/head/tail)",
      "- Use smart-explore tools for structural code exploration instead of reading files manually",
    ],
    [
      IMPORTANT: This tool is for terminal operations like git, npm, docker, etc. DO NOT use it for file operations - use the specialized tools for reading, writing, editing, and searching files instead.
IMPORTANT: This tool is for terminal operations like git, npm, docker, etc. NEVER use cat, sed, head, tail, or any bash command to read file contents. Use smart-explore_smart_unfold with offset/limit/anchor for code files, or Read for non-code files (JSON, markdown, config).
  ],
  task: [
    [
      "- If you want to read a specific file path, use the Read or Glob tool instead of the Task tool, to find the match more quickly",
      "- If you want to read a specific file path, use the Glob tool instead of the Task tool, to find the match more quickly",
    ],
    [
      "- If you are searching for code within a specific file or set of 2-3 files, use the Read tool instead of the Task tool, to find the match more quickly",
      "- If you are searching for code within a specific file or set of 2-3 files, use smart-explore tools instead of the Task tool, to find the match more quickly",
    ],
  ],
  write: [
    [
      "- If this is an existing file, you MUST use the Read tool first to read the file's contents. This tool will fail if you did not read the file first.",
      "- If this is an existing file, you MUST read the file's contents first. This tool will fail if you did not read the file first.",
    ],
  ],
  edit: [
    [
      "- You must use your `Read` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.",
      "- You must read the file at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.",
    ],
    [
      "- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix.",
      "- When editing text from file output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix.",
    ],
  ],
}

export default (async () => {
  return {
    "tool.definition": async (input, output) => {
      const replacements = READ_MENTIONS[input.toolID]
      if (!replacements) return
      for (const [from, to] of replacements) {
        output.description = output.description.replace(from, to)
      }
    },
  }
}) satisfies Plugin
