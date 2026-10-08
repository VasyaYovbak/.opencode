import { open } from "node:fs/promises"
import { resolve } from "node:path"
import type { InputSchema, MCPResult, MCPTool } from "./mcp-session.js"

export type CLIOutput = { stdout: string; stderr: string; exitCode: number }
const usage = "Usage: $CBM [--quiet] [--json] <tool> [--flags | JSON | --args-file PATH]\n"

function object(text: string): Record<string, unknown> {
  const value = JSON.parse(text)
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Arguments must be a JSON object")
  return value
}

function typeOf(schema: InputSchema): string | undefined {
  return Array.isArray(schema.type) ? schema.type.find((type) => type !== "null") : schema.type
}

function valueOf(text: string, schema: InputSchema): unknown {
  let value: unknown = text
  const type = typeOf(schema)
  if (type === "boolean") {
    if (text !== "true" && text !== "false") throw new Error(`Expected true or false, got ${JSON.stringify(text)}`)
    value = text === "true"
  } else if (type === "integer" || type === "number") {
    value = Number(text)
    if (!text.trim() || !Number.isFinite(value) || (type === "integer" && (!/^[+-]?\d+$/.test(text) || !Number.isSafeInteger(value)))) {
      throw new Error(`Invalid ${type}: ${JSON.stringify(text)}`)
    }
  } else if (type === "object") {
    value = object(text)
  }
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`Expected one of: ${schema.enum.join(", ")}`)
  return value
}

function flags(argv: string[], schema: InputSchema): Record<string, unknown> {
  const result: Record<string, unknown> = Object.create(null)
  const properties = schema.properties ?? {}
  for (let i = 0; i < argv.length; i++) {
    const match = /^--([^=]+)(?:=(.*))?$/s.exec(argv[i])
    if (!match) throw new Error(`Unexpected argument: ${argv[i]}`)
    const key = match[1].replaceAll("-", "_")
    if (!Object.hasOwn(properties, key)) throw new Error(`Unknown flag: --${match[1]}`)
    const property = properties[key]
    const type = typeOf(property)
    let text = match[2]
    if (text === undefined) {
      if (type === "boolean" && (argv[i + 1] === undefined || argv[i + 1].startsWith("--"))) text = "true"
      else {
        text = argv[++i]
        if (text === undefined || text.startsWith("--")) throw new Error(`Missing value for --${match[1]}`)
      }
    }
    const value = valueOf(text, type === "array" ? property.items ?? {} : property)
    if (type === "array") {
      const values = (result[key] ??= []) as unknown[]
      values.push(value)
    } else result[key] = value
  }
  return result
}

function help(tool: MCPTool): string {
  const required = new Set(tool.inputSchema.required)
  const rows = Object.entries(tool.inputSchema.properties ?? {}).map(([key, schema]) => {
    const type = typeOf(schema) ?? "value"
    const details = [required.has(key) ? "required" : "optional", type === "array" ? "repeatable" : type]
    if (schema.enum) details.push(schema.enum.join("|"))
    if (schema.default !== undefined) details.push(`default: ${JSON.stringify(schema.default)}`)
    return `  --${key.replaceAll("_", "-")} <${type}> (${details.join(", ")})\n    ${schema.description ?? ""}`
  })
  return `${usage}${tool.name}: ${tool.description ?? ""}\n\n${rows.join("\n")}\n`
}

export async function runCLI(
  argv: string[],
  cwd: string,
  tools: Map<string, MCPTool>,
  stdin: () => Promise<string>,
  call: (name: string, args: Record<string, unknown>) => Promise<MCPResult>,
): Promise<CLIOutput> {
  const raw = argv.includes("--json")
  const quiet = argv.includes("--quiet")
  argv = argv.filter((arg) => arg !== "--json" && arg !== "--quiet")
  if (!argv.length) return { stdout: "", stderr: usage, exitCode: 1 }
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    return { stdout: usage + `Tools: ${[...tools.keys()].join(", ")}\n`, stderr: "", exitCode: 0 }
  }
  const name = argv[0] === "trace_call_path" ? "trace_path" : argv[0]
  const tool = tools.get(name)
  if (!tool) throw new Error(`Unknown CBM tool: ${name}`)
  const rest = argv.slice(1)
  if (rest.includes("--help") || rest.includes("-h")) return { stdout: help(tool), stderr: "", exitCode: 0 }

  let args: Record<string, unknown> = {}
  let stderr = ""
  const fileIndex = rest.indexOf("--args-file")
  if (fileIndex >= 0) {
    if (!rest[fileIndex + 1]) throw new Error("--args-file requires a path")
    const file = await open(resolve(cwd, rest[fileIndex + 1]))
    try {
      const status = await file.stat()
      if (!status.isFile() || status.size > 1024 * 1024) throw new Error("Argument file must be a regular file of at most 1 MiB")
      args = object(await file.readFile("utf8"))
    } finally { await file.close() }
  } else if (rest[0]?.trimStart().startsWith("{")) {
    args = object(rest[0])
    if (!quiet) stderr = "warning: inline JSON is deprecated by CBM; prefer flags, --args-file, or stdin.\n"
  } else if (rest[0]?.startsWith("--")) {
    args = flags(rest, tool.inputSchema)
  } else if (rest.length) {
    throw new Error(`Unexpected argument: ${rest[0]}`)
  } else if (name !== "list_projects") {
    const text = await stdin()
    if (text.trim()) args = object(text)
  }

  const result = await call(name, args)
  const texts = (result.content ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "")
  const error = result.isError || texts.some((text) => {
    try { return Boolean(JSON.parse(text)?.error) } catch { return false }
  })
  const firstText = result.content?.[0]?.text
  const text = (raw || typeof firstText !== "string" ? JSON.stringify(result) : firstText) + "\n"
  if (error && !raw) return { stdout: "", stderr: stderr + text, exitCode: 1 }
  return { stdout: text, stderr, exitCode: error ? 1 : 0 }
}
