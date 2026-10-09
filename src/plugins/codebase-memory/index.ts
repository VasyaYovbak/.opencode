import { readFile } from "node:fs/promises"
import { execFile } from "node:child_process"
import { delimiter, dirname, join } from "node:path"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode/plugin"
import { ensureBundledBinary } from "./binary.js"
import { createCLIBridge } from "./bridge.js"
import { registerSessionBootstrap } from "./session-bootstrap.js"
import type { ShellEnv } from "../shell-env/index.js"

const execFileAsync = promisify(execFile)
const pluginDir = dirname(fileURLToPath(import.meta.url))
const binDir = join(pluginDir, "bin")

async function stopStaleDaemons(binary: string): Promise<void> {
  const output = await execFileAsync("ps", ["-axo", "pid=,command="]).then((result) => result.stdout).catch(() => "")
  const stale = output.split("\n").flatMap((line) => {
    const match = /^\s*(\d+)\s+(.*)$/.exec(line)
    if (!match || !match[2].includes("--cbm-daemon-internal") || match[2].startsWith(binary)) return []
    return [Number(match[1])]
  })
  for (const pid of stale) {
    try { process.kill(pid, "SIGTERM") } catch {}
  }
  if (!stale.length) return
  await new Promise((resolve) => setTimeout(resolve, 2000))
  for (const pid of stale) {
    try {
      process.kill(pid, 0)
      process.kill(pid, "SIGKILL")
    } catch {}
  }
}

export async function initializeCodebaseMemory(ctx: Plugin.Context, shellEnv: ShellEnv): Promise<() => Promise<void>> {
  const binary = process.env.CBM_BINARY || await ensureBundledBinary(binDir)
  const systemPrompt = await readFile(join(pluginDir, "system-prompt.md"), "utf8")
  const bridge = process.env.CBM_BRIDGE === "0" ? undefined : await createCLIBridge(binary).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Codebase Memory CLI bridge unavailable; using native CLI: ${message}`)
    return undefined
  })

  try {
    await ctx.session.hook("context", (event) => {
      event.system.push({ type: "text", text: systemPrompt })
    })

    await stopStaleDaemons(binary)
    await execFileAsync(binary, ["daemon", "start"], { timeout: 30_000 }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Codebase Memory daemon startup failed: ${message}`)
    })

    await ctx.shell.hook("create.before", (event) => {
      const path = event.env.PATH ?? process.env.PATH
      event.env.PATH = path ? `${binDir}${delimiter}${path}` : binDir
      event.env.CBM = "opencode-cbm"
      event.env.CBM_BINARY = binary
      if (bridge) event.env.CBM_SOCKET = bridge.socket
      else delete event.env.CBM_SOCKET
      event.env.CBM_LOG_LEVEL ??= process.env.CBM_LOG_LEVEL ?? "error"
    })

    await registerSessionBootstrap(ctx, binary, shellEnv)

    void bridge?.warm(ctx.location.directory || process.cwd()).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Codebase Memory warm-up failed: ${message}`)
    })
  } catch (error) {
    await bridge?.close()
    throw error
  }
  return async () => { await bridge?.close() }
}
