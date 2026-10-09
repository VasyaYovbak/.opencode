import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type { Plugin } from "@opencode/plugin"
import type { ShellEnv } from "../shell-env/index.js"

const execFileAsync = promisify(execFile)

type Project = { name: string; root_path: string }

async function runCBM(binary: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(binary, ["cli", ...args], { timeout: 60_000 })
  return stdout
}

function normalize(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, "") : path
}

async function bootstrap(binary: string, directory: string, shellEnv: ShellEnv): Promise<string> {
  const { projects } = JSON.parse(await runCBM(binary, ["list_projects", "--format", "json"])) as {
    projects: Project[]
  }
  const project = projects.find((item) => normalize(item.root_path) === normalize(directory))
  if (!project) {
    return `[Codebase Memory] No indexed project for checkout ${directory}. Do not start indexing on your own; ask the user whether to index it.`
  }

  await shellEnv.set("CBM_PROJECT", project.name)

  const status = await runCBM(binary, ["index_status", "--project", project.name])
  const field = (key: string) => status.match(new RegExp(`^${key}: (.*)$`, "m"))?.[1] ?? "unknown"
  return [
    `[Codebase Memory] Project: ${project.name}. CBM_PROJECT is already set; use "$CBM_PROJECT" in commands.`,
    `Index: status ${field("status")}, nodes ${field("nodes")}, edges ${field("edges")}, indexed_at ${field("indexed_at")}.`,
  ].join("\n")
}

export async function registerSessionBootstrap(ctx: Plugin.Context, binary: string, shellEnv: ShellEnv): Promise<void> {
  const started = new Set<string>()
  const directory = ctx.location.directory || process.cwd()

  await ctx.session.hook("prompt", async (event) => {
    if (started.has(event.sessionID)) return
    started.add(event.sessionID)

    const message = await bootstrap(binary, directory, shellEnv).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error)
      return `[Codebase Memory] Auto-setup failed: ${reason}. Run list_projects manually.`
    })
    await ctx.session.synthetic({ sessionID: event.sessionID, text: message })
  })
}
