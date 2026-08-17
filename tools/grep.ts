import { createInterface } from "node:readline"
import { spawn } from "node:child_process"
import { stat } from "node:fs/promises"
import path from "node:path"
import type { Readable } from "node:stream"
import { tool } from "@opencode-ai/plugin"

const MAX_MATCHES = 100
const MAX_LINE_LENGTH = 2_000

type RipgrepMatch = {
  type?: string
  data?: {
    path?: { text?: string }
    lines?: { text?: string }
    line_number?: number
  }
}

async function readStream(stream: Readable): Promise<string> {
  let result = ""
  for await (const chunk of stream) result += String(chunk)
  return result
}

export default tool({
  description:
    "Search file contents with ripgrep. Unlike the built-in grep, an exact file path searches only that file.",
  args: {
    pattern: tool.schema.string().describe("Regular expression to search for"),
    path: tool.schema.string().optional().describe("File or directory to search"),
    include: tool.schema.string().optional().describe('File pattern for directory searches, e.g. "*.ts"'),
  },
  async execute(args, context) {
    const requested = path.resolve(context.directory, args.path ?? ".")
    const info = await stat(requested).catch(() => undefined)
    if (!info) throw new Error(`Path not found: ${requested}`)
    if (!info.isFile() && !info.isDirectory()) throw new Error(`Path is not a file or directory: ${requested}`)

    const directory = info.isDirectory() ? requested : path.dirname(requested)
    const target = info.isDirectory() ? "." : path.basename(requested)
    const rgArgs = [
      "--no-config",
      "--json",
      "--hidden",
      "--no-messages",
      "--glob=!**/.git/**",
      ...(info.isDirectory() && args.include ? [`--glob=${args.include}`] : []),
      "--",
      args.pattern,
      target,
    ]

    const child = spawn("rg", rgArgs, {
      cwd: directory,
      stdio: ["ignore", "pipe", "pipe"],
    })
    if (!child.stdout || !child.stderr) throw new Error("Unable to start ripgrep")

    const exitPromise = new Promise<number | null>((resolve, reject) => {
      child.once("error", reject)
      child.once("close", resolve)
    })
    const stderrPromise = readStream(child.stderr)
    const matches: Array<{ file: string; line: number; text: string }> = []
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity })
    let stopped = false

    for await (const line of lines) {
      if (!line) continue
      const event = JSON.parse(line) as RipgrepMatch
      if (event.type !== "match" || !event.data?.path?.text || !event.data.line_number) continue

      matches.push({
        file: path.resolve(directory, event.data.path.text),
        line: event.data.line_number,
        text: (event.data.lines?.text ?? "").replace(/\r?\n$/, "").slice(0, MAX_LINE_LENGTH),
      })
      if (matches.length > MAX_MATCHES) {
        stopped = true
        child.kill()
        break
      }
    }
    lines.close()

    const [exitCode, stderr] = await Promise.all([exitPromise, stderrPromise])
    if (!stopped && exitCode !== 0 && exitCode !== 1) {
      throw new Error(stderr.trim() || `ripgrep failed with exit code ${exitCode}`)
    }
    if (matches.length === 0) return "No files found"

    const truncated = matches.length > MAX_MATCHES
    const output: string[] = [`Found ${truncated ? MAX_MATCHES : matches.length} matches`]
    let current = ""
    for (const match of matches.slice(0, MAX_MATCHES)) {
      if (match.file !== current) {
        if (current) output.push("")
        current = match.file
        output.push(`${match.file}:`)
      }
      output.push(`  Line ${match.line}: ${match.text}`)
    }
    if (truncated) output.push("", "(Results truncated. Consider using a more specific path or pattern.)")
    return output.join("\n")
  },
})
