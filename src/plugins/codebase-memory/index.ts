import { readFile } from "node:fs/promises"
import { execFile } from "node:child_process"
import { delimiter, dirname, join } from "node:path"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode/plugin"
import { ensureBundledBinary } from "./binary.js"

const execFileAsync = promisify(execFile)
const pluginDir = dirname(fileURLToPath(import.meta.url))
const binDir = join(pluginDir, "bin")

export async function initializeCodebaseMemory(ctx: Plugin.Context): Promise<void> {
  const binary = process.env.CBM_BINARY || await ensureBundledBinary(binDir)
  const systemPrompt = await readFile(join(pluginDir, "system-prompt.md"), "utf8")

  await ctx.session.hook("context", (event) => {
    event.system.push({ type: "text", text: systemPrompt })
  })

  await execFileAsync(binary, ["daemon", "start"]).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Codebase Memory daemon startup failed: ${message}`)
  })

  await ctx.shell.hook("create.before", (event) => {
    const path = event.env.PATH ?? process.env.PATH
    event.env.PATH = path ? `${binDir}${delimiter}${path}` : binDir
    event.env.CBM = "opencode-cbm"
    event.env.CBM_BINARY = binary
    event.env.CBM_LOG_LEVEL ??= process.env.CBM_LOG_LEVEL ?? "error"
  })
}
