import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type { Plugin } from "@opencode/plugin"
import type { ShellEnv } from "../shell-env/index.js"
import { callBridge } from "./bridge.js"
import { normalizeProjectPath } from "./paths.js"

const execFileAsync = promisify(execFile)

type Project = { name: string; root_path: string }

async function runCBM(binary: string, socket: string | undefined, args: string[], cwd: string): Promise<string> {
  if (socket) {
    const result = await callBridge(socket, binary, args, cwd).catch(() => undefined)
    if (result) {
      if (result.exitCode !== 0) throw new Error(result.stderr || `CBM exited with ${result.exitCode}`)
      return result.stdout
    }
  }
  const { stdout } = await execFileAsync(binary, ["cli", ...args], { cwd, timeout: 60_000 })
  return stdout
}

async function bootstrap(binary: string, socket: string | undefined, directory: string, shellEnv: ShellEnv): Promise<string> {
  const { projects } = JSON.parse(await runCBM(binary, socket, ["list_projects", "--format", "json"], directory)) as {
    projects: Project[]
  }
  const project = projects.find((item) => normalizeProjectPath(item.root_path) === normalizeProjectPath(directory))
  if (!project) {
    return `[Codebase Memory] No indexed project for checkout ${directory}. Do not start indexing on your own; ask the user whether to index it.`
  }

  await shellEnv.set("P", project.name)

  const status = await runCBM(binary, socket, ["index_status", "--project", project.name], directory)
  const field = (key: string) => status.match(new RegExp(`^${key}: (.*)$`, "m"))?.[1] ?? "unknown"
  return [
    `[Codebase Memory] Project: ${project.name}. Variable $P is already set; use "$P" in commands.`,
    `Index: status ${field("status")}, nodes ${field("nodes")}, edges ${field("edges")}, indexed_at ${field("indexed_at")}.`,
  ].join("\n")
}

export async function registerSessionBootstrap(ctx: Plugin.Context, binary: string, socket: string | undefined, shellEnv: ShellEnv): Promise<void> {
  const started = new Set<string>()
  const directory = ctx.location.directory || process.cwd()

  await ctx.session.hook("prompt", async (event) => {
    if (started.has(event.sessionID)) return
    started.add(event.sessionID)

    const message = await bootstrap(binary, socket, directory, shellEnv).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error)
      return `[Codebase Memory] Auto-setup failed: ${reason}. Run list_projects manually.`
    })
    await ctx.session.synthetic({ sessionID: event.sessionID, text: message })
  })
}
