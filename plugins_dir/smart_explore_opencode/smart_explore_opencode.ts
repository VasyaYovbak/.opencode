import type { Plugin } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const GREP_HINT_MCP = " For searching code by meaning (functions, concepts, 'where is X handled'), use the smart_explore_smart_search tool instead — it does hybrid vector + BM25 search and returns ranked symbols. Use Grep only for exact string/regex matches (TODO, constants, error messages)."
const GLOB_HINT_MCP = " For finding code inside files, use smart_explore_smart_search instead. Use Glob only for file path patterns (*.test.ts, file names)."
const READ_HINT_MCP = " CRITICAL: Do NOT use Read with offset/limit to read specific functions or classes in code files. Instead, use smart_explore_smart_unfold with file_path and symbol_name — it returns the exact function body via AST parsing. Read is ONLY for: JSON, markdown, config files, and files under 50 lines. For any .ts/.py/.js/.go/.rs file over 50 lines, you MUST use smart_explore_smart_unfold instead of Read."

const GREP_HINT_CLI = " For searching code by meaning (functions, concepts, 'where is X handled'), run `smart-explore search \"<query>\"` in bash — it does hybrid vector + BM25 search. Use Grep only for exact string/regex matches (TODO, constants, error messages)."
const GLOB_HINT_CLI = " For finding code inside files, run `smart-explore search \"<query>\"` in bash. Use Glob only for file path patterns (*.test.ts, file names)."
const READ_HINT_CLI = " CRITICAL: Do NOT use Read with offset/limit to read specific functions or classes in code files. Instead, run `smart-explore unfold <file> <symbol>` in bash. Read is ONLY for: JSON, markdown, config files, and files under 50 lines."

const SMART_EXPLORE_MCP_NAME = "smart-explore"
const CONFIG_FILE_NAME = "smart-explore-config.json"
const MUTATING_TOOLS = new Set(["edit", "write", "patch", "apply_patch"])
const STARTUP_DELAY_MS = 2_000
const EDIT_DEBOUNCE_MS = 1_000
const PROGRESS_TOAST_MS = 1_000

function readForceBashExecution(configRoot: string): boolean {
  const configPath = join(configRoot, CONFIG_FILE_NAME)
  if (!existsSync(configPath)) return false
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf-8"))
    return raw?.force_bash_execution === true
  } catch {
    return false
  }
}

const SmartExploreOpenCodePlugin: Plugin = async ({ client, directory, worktree }) => {
  const resolvedWorktree = worktree ? resolve(worktree) : undefined
  const projectRoot = resolvedWorktree && resolvedWorktree !== "/" ? resolvedWorktree : resolve(directory)
  const configRoot = join(process.env.HOME || "", ".config", "opencode")
  const scriptPath = join(configRoot, "mcp", "smart-explore", "scripts", "mcp-server.cjs")
  const pluginDir = dirname(fileURLToPath(import.meta.url))
  const mcpRulesPath = join(pluginDir, "smart-explore-rules.md")
  const cliRulesPath = join(pluginDir, "smart-explore-cli-rules.md")
  const forceBash = readForceBashExecution(configRoot)

  let timer: ReturnType<typeof setTimeout> | undefined
  let running = false
  let pendingReason: string | undefined
  let started = false
  let lastExitCode: number | undefined
  let lastProgressToastAt = 0
  let lastProgressMessage = ""

  const log = async (level: "info" | "warn" | "error", message: string, extra?: Record<string, unknown>) => {
    await client.app.log({
      body: { service: "smart-explore-opencode", level, message, extra },
    })
  }

  if (resolvedWorktree === "/") {
    void log("warn", "ignoring root worktree for smart-explore cache warm", { worktree, directory, projectRoot })
  }

  const toast = async (variant: "info" | "success" | "warning" | "error", title: string, message: string, duration = 4000) => {
    await client.tui.showToast({
      body: { title, message, variant, duration },
    }).catch((error) => {
      void log("warn", "smart-explore toast failed", { error: String(error) })
    })
  }

  const progressToast = async (message: string, force = false) => {
    const now = Date.now()
    if (!force && message === lastProgressMessage) return
    if (!force && now - lastProgressToastAt < PROGRESS_TOAST_MS) return
    lastProgressToastAt = now
    lastProgressMessage = message
    await toast("info", "Smart Explore", message, PROGRESS_TOAST_MS + 1_000)
  }

  const handleProgressLine = (line: string) => {
    const match = line.match(/\[smart-explore\] WARM_PROGRESS (\S+) (.*)$/)
    if (!match) return
    const [, stage, message] = match
    void log("info", "smart-explore cache warm progress", { stage, message })
    if (stage === "done") return
    void progressToast(message, stage === "starting" || stage === "outline")
  }

  const scheduleWarm = (reason: string, delay: number) => {
    pendingReason = reason
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      void runWarm(pendingReason || reason)
    }, delay)
  }

  const runWarm = async (reason: string) => {
    if (running) {
      pendingReason = reason
      return
    }

    const command = existsSync(scriptPath)
      ? { bin: "node", args: [scriptPath, "--warm-cache", projectRoot] }
      : { bin: "smart-explore-mcp", args: ["--warm-cache", projectRoot] }

    running = true
    pendingReason = undefined
    started = true
    lastProgressToastAt = 0
    lastProgressMessage = ""

    await log("info", "smart-explore cache warm started", { reason, projectRoot, command: command.bin })
    await toast(
      "info",
      "Smart Explore",
      `Warming cache for ${basename(projectRoot)}...`,
      3000
    )

    const child = spawn(command.bin, command.args, {
      cwd: projectRoot,
      stdio: ["ignore", "ignore", "pipe"],
    })

    let stderrBuffer = ""
    child.stderr?.setEncoding("utf8")
    child.stderr?.on("data", (chunk) => {
      stderrBuffer += chunk
      const lines = stderrBuffer.split(/\r?\n/)
      stderrBuffer = lines.pop() || ""
      for (const line of lines) handleProgressLine(line)
    })

    child.on("error", (error) => {
      running = false
      void log("error", "smart-explore cache warm failed to start", { error: String(error), command: command.bin })
      void toast("error", "Smart Explore", "Cache warm failed to start", 5000)
    })

    child.on("close", (code) => {
      if (stderrBuffer) {
        handleProgressLine(stderrBuffer)
        stderrBuffer = ""
      }
      running = false
      lastExitCode = code ?? 1
      void log(code === 0 ? "info" : "warn", "smart-explore cache warm finished", { code, projectRoot })
      void toast(
        code === 0 ? "success" : "warning",
        "Smart Explore",
        code === 0 ? "Cache warm complete" : `Cache warm exited with code ${code}`,
        3500
      )
      if (pendingReason) {
        const nextReason = pendingReason
        pendingReason = undefined
        scheduleWarm(nextReason, EDIT_DEBOUNCE_MS)
      }
    })
  }

  scheduleWarm("startup", STARTUP_DELAY_MS)

  return {
    config: async (config) => {
      const instructions = (config.instructions ??= []) as string[]
      const rulesPath = forceBash ? cliRulesPath : mcpRulesPath

      if (forceBash) {
        const permission = (config.permission ??= {}) as Record<string, unknown>
        const bash = (permission.bash ??= {}) as Record<string, string>
        if (typeof bash === "string") {
          permission.bash = { "*": bash, "smart-explore *": "allow" }
        } else {
          (bash as Record<string, string>)["smart-explore *"] = "allow"
        }
      } else {
        const mcp = (config.mcp ??= {}) as Record<string, unknown>
        if (!mcp[SMART_EXPLORE_MCP_NAME]) {
          mcp[SMART_EXPLORE_MCP_NAME] = {
            type: "local",
            command: ["smart-explore-mcp"],
            enabled: true,
          }
        }
      }

      if (!instructions.includes(rulesPath)) {
        instructions.push(rulesPath)
      }
    },

    "tool.definition": async (input, output) => {
      const grepHint = forceBash ? GREP_HINT_CLI : GREP_HINT_MCP
      const globHint = forceBash ? GLOB_HINT_CLI : GLOB_HINT_MCP
      const readHint = forceBash ? READ_HINT_CLI : READ_HINT_MCP
      const grepKey = forceBash ? "smart-explore search" : "smart_explore_smart_search"
      const readKey = forceBash ? "smart-explore unfold" : "smart_explore_smart_unfold"

      if (input.toolID === "grep") {
        if (!output.description?.includes(grepKey)) {
          output.description = (output.description || "") + grepHint
        }
      } else if (input.toolID === "glob") {
        if (!output.description?.includes(grepKey)) {
          output.description = (output.description || "") + globHint
        }
      } else if (input.toolID === "read") {
        if (!output.description?.includes(readKey)) {
          output.description = (output.description || "") + readHint
        }
      }
    },

    event: async ({ event }) => {
      if (event.type === "server.connected") {
        if (!started && !timer) scheduleWarm("server.connected", STARTUP_DELAY_MS)
      }
      if (event.type === "session.created") {
        if (running) {
          await toast("info", "Smart Explore", `Warming cache for ${basename(projectRoot)}...`, 3000)
        } else if (started && lastExitCode === 0) {
          await toast("success", "Smart Explore", "Cache warm complete", 3500)
        } else if (started && lastExitCode !== undefined) {
          await toast("warning", "Smart Explore", `Cache warm exited with code ${lastExitCode}`, 5000)
        } else if (!started && !timer) {
          scheduleWarm("session.created", STARTUP_DELAY_MS)
        }
      }
      if (event.type === "file.edited") {
        scheduleWarm("file.edited", EDIT_DEBOUNCE_MS)
      }
    },

    "tool.execute.after": async (input, output) => {
      const tool = input.tool.toLowerCase()

      if (tool === "invalid" && forceBash) {
        const argsStr = JSON.stringify(input.args ?? {})
        const outStr = String(output.output ?? "")
        const mentioned = argsStr.includes("smart-explore") || argsStr.includes("smart_explore") ||
          outStr.includes("smart-explore") || outStr.includes("smart_explore")
        if (mentioned) {
          output.output = "'smart-explore' is not a tool — it is a CLI command. Run it via bash:\n  smart-explore search \"<query>\"\n  smart-explore outline <file>\n  smart-explore unfold <file> <symbol>\n  smart-explore callers <symbol>\n  smart-explore callees <symbol>\n  smart-explore related <file>\nSee smart-explore-cli-rules for full reference."
          return
        }
      }

      if (!MUTATING_TOOLS.has(tool)) return

      const maybeError = (output as { error?: unknown }).error
      if (maybeError) return

      const textOutput = String((output as { output?: unknown }).output ?? "")
      if (textOutput.startsWith("Error:")) return

      scheduleWarm(`tool.${tool}`, EDIT_DEBOUNCE_MS)
    },
  }
}

export default SmartExploreOpenCodePlugin