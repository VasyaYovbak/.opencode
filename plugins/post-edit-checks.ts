import type { Plugin } from "@opencode-ai/plugin"
import { execFile } from "node:child_process"
import { existsSync, readFileSync, statSync } from "node:fs"
import { extname, relative, resolve, sep } from "node:path"

const FILE_MUTATING_TOOLS = new Set(["edit", "write", "patch", "apply_patch"])

interface CheckFailure {
  path: string
  check: string
  message: string
  /** 0-indexed line number (LSP convention). Undefined = whole-file issue. */
  line?: number
  /** 0-indexed character offset (LSP convention). */
  character?: number
}

/**
 * LSP Diagnostic shape consumed by the OpenCode TUI.
 * metadata.diagnostics is Record<absoluteFilePath, Diagnostic[]>.
 * Only severity === 1 (Error) is rendered; others are silently filtered.
 */
interface Diagnostic {
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  message: string
  severity: 1
}

interface SpawnOptions {
  silentMissing?: boolean
  timeout?: number
  /** Prefer stdout over stderr when capturing failure output (e.g. dmypy). */
  preferStdout?: boolean
}

const LARGE_FILE_LIMIT_BYTES = 5_120_000 // 5 MB — matches check-added-large-files in .pre-commit-config.yaml

const PYTHON_EXTENSIONS = new Set([".py", ".pyi"])
const YAML_EXTENSIONS = new Set([".yaml", ".yml"])
const JSON_EXTENSIONS = new Set([".json"])
const PATH_KEYS = new Set(["path", "file", "filePath", "filepath", "targetPath"])
const PATCH_FILE_HEADER_RE = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm

/**
 * OpenCode plugin running fast pre-commit-style checks after the Edit tool
 * (and write/patch tools) modifies a file.
 *
 * Failures are appended to output.output so the model sees them in the tool
 * result and can immediately fix the issues. They also populate
 * output.metadata.diagnostics so the TUI renders them as styled error entries.
 *
 * Performance:
 * - All Python files batched into a single ruff invocation (check + format)
 * - All YAML files batched into a single python3 invocation
 * - All subprocess checks run concurrently via Promise.all
 * - JSON, newline, large-file checks are pure JS (no subprocess overhead)
 * - dmypy daemon is warmed up at plugin init (background, fire-and-forget)
 *   so incremental type-checks take ~0.5s instead of ~16s cold start
 */
const PostEditChecksPlugin: Plugin = async ({ client, directory }) => {
  const mypyDirs = parseMypyDirs(directory)

  // Warm up the dmypy daemon in the background while the user writes their
  // first prompt. By the time the first file edit happens the daemon is ready
  // and all subsequent checks take ~0.5s instead of ~16s.
  if (mypyDirs.length > 0) {
    runMypyDaemon(mypyDirs, directory)
      .then(() =>
        client.app.log({
          body: { service: "post-edit-checks", level: "info", message: "dmypy daemon warmed up" },
        }),
      )
      .catch(() => {
        // dmypy not available or failed — silently ignore, mypy checks will be skipped
      })
  }

  return {
    "tool.execute.after": async (input, output) => {
      const tool = input.tool.toLowerCase()
      if (!FILE_MUTATING_TOOLS.has(tool)) return

      const args = (input.args ?? {}) as Record<string, unknown>
      const paths = collectPaths(args)
      if (paths.length === 0) return

      try {
        const failures = await runQuickChecks(paths, directory, mypyDirs)
        if (failures.length === 0) return

        output.output = `${output.output}\n\n${formatReport(failures, directory)}`
        output.metadata = { ...(output.metadata ?? {}), diagnostics: toUIDiagnostics(failures) }

        await client.app.log({
          body: {
            service: "post-edit-checks",
            level: "warn",
            message: `post-edit-checks: ${failures.length} failure(s) after ${tool}`,
            extra: { failures },
          },
        })
      } catch (error) {
        await client.app.log({
          body: {
            service: "post-edit-checks",
            level: "error",
            message: "Error running post-edit checks",
            extra: { error: String(error) },
          },
        })
      }
    },
  }
}

export default PostEditChecksPlugin
export { PostEditChecksPlugin }

/** Recursively collect file paths from tool arguments. */
function collectPaths(value: unknown): string[] {
  const result = new Set<string>()

  const visit = (node: unknown): void => {
    if (node === null || typeof node !== "object") return

    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }

    for (const [key, nested] of Object.entries(node as Record<string, unknown>)) {
      if (PATH_KEYS.has(key) && typeof nested === "string") {
        result.add(nested)
      } else if (key === "patchText" && typeof nested === "string") {
        for (const path of extractPathsFromPatchText(nested)) {
          result.add(path)
        }
      } else if (key === "paths" && Array.isArray(nested)) {
        for (const item of nested) {
          if (typeof item === "string") result.add(item)
        }
      } else {
        visit(nested)
      }
    }
  }

  visit(value)
  return [...result]
}

function extractPathsFromPatchText(patchText: string): string[] {
  const result = new Set<string>()

  for (const match of patchText.matchAll(PATCH_FILE_HEADER_RE)) {
    const rawPath = match[1]?.trim()
    if (rawPath) result.add(rawPath)
  }

  return [...result]
}

/**
 * Run fast file-scoped checks.
 *
 * Subprocess calls are batched by file type and run concurrently.
 * Pure-JS checks (JSON, newline, large-file) run synchronously — no subprocess overhead.
 */
async function runQuickChecks(paths: string[], directory: string, mypyDirs: string[]): Promise<CheckFailure[]> {
  const fullPaths = paths
    .map((rel) => resolve(directory, rel))
    .filter((p) => existsSync(p))

  if (fullPaths.length === 0) return []

  const ext = (p: string): string => extname(p).toLowerCase()
  const pythonFiles = fullPaths.filter((p) => PYTHON_EXTENSIONS.has(ext(p)))
  const yamlFiles = fullPaths.filter((p) => YAML_EXTENSIONS.has(ext(p)))
  const jsonFiles = fullPaths.filter((p) => JSON_EXTENSIONS.has(ext(p)))

  // Kick off all subprocess checks concurrently — no waiting on each other.
  const tasks: Promise<CheckFailure[]>[] = []

  if (pythonFiles.length > 0) {
    // Single ruff process for all Python files instead of one per file.
    tasks.push(runRuffCheckBatch(pythonFiles, directory))
    tasks.push(runRuffFormatBatch(pythonFiles, directory))

    // Run dmypy only when the edited file lives inside a mypy-checked directory.
    const inMypyDir = pythonFiles.some((p) => mypyDirs.some((d) => p.startsWith(d + sep) || p === d))
    if (inMypyDir && mypyDirs.length > 0) {
      tasks.push(runMypyDaemon(mypyDirs, directory))
    }
  }

  if (yamlFiles.length > 0) {
    // Single python3 process for all YAML files.
    tasks.push(runYamlBatch(yamlFiles))
  }

  // Pure-JS checks: synchronous, no process spawn cost.
  const syncFailures: CheckFailure[] = [
    ...jsonFiles.flatMap(runJsonCheck),
    ...fullPaths.flatMap(runNewlineCheck),
    ...fullPaths.flatMap(runLargeFileCheck),
  ]

  const asyncFailures = (await Promise.all(tasks)).flat()
  return [...asyncFailures, ...syncFailures]
}

// ---------------------------------------------------------------------------
// Subprocess checks (async + batched)
// ---------------------------------------------------------------------------

async function runRuffCheckBatch(paths: string[], directory: string): Promise<CheckFailure[]> {
  const msg = await spawnAsync("ruff", ["check", ...paths], { silentMissing: true })
  if (!msg) return []

  // ruff check output: /abs/path/file.py:LINE:COL: CODE description
  // ruff normalises paths relative to cwd — resolve back to absolute.
  const lineRe = /^(.+?):(\d+):(\d+):\s+(.+)$/
  const failures: CheckFailure[] = []
  for (const line of msg.split("\n")) {
    const m = lineRe.exec(line.trim())
    if (m) {
      failures.push({
        path: resolve(directory, m[1]),
        check: "ruff-check",
        message: m[4],
        line: parseInt(m[2], 10) - 1,      // LSP is 0-indexed
        character: parseInt(m[3], 10) - 1,
      })
    }
  }

  // Fallback: unexpected output format — preserve raw message
  return failures.length > 0 ? failures : [{ path: paths[0], check: "ruff-check", message: msg }]
}

async function runRuffFormatBatch(paths: string[], directory: string): Promise<CheckFailure[]> {
  const msg = await spawnAsync("ruff", ["format", "--check", ...paths], { silentMissing: true })
  if (!msg) return []

  // ruff format --check output: "Would reformat: /abs/path/file.py"
  // ruff normalises paths relative to cwd — resolve back to absolute.
  const failures: CheckFailure[] = []
  for (const line of msg.split("\n")) {
    const trimmed = line.trim()
    if (trimmed.startsWith("Would reformat: ")) {
      failures.push({
        path: resolve(directory, trimmed.slice("Would reformat: ".length)),
        check: "ruff-format",
        message: "File needs reformatting",
      })
    }
  }

  return failures.length > 0 ? failures : [{ path: paths[0], check: "ruff-format", message: msg }]
}

async function runYamlBatch(paths: string[]): Promise<CheckFailure[]> {
  // Single python3 invocation validates all YAML files.
  // Exits 0 (silently) if yaml module is not installed.
  // On failure writes JSON-encoded errors to stderr for structured parsing.
  const script = [
    "import sys, json",
    "try:",
    "    import yaml",
    "except ImportError:",
    "    sys.exit(0)",
    "errors = []",
    "for p in sys.argv[1:]:",
    "    try:",
    "        yaml.safe_load(open(p, 'r', encoding='utf-8').read())",
    "    except Exception as e:",
    "        errors.append({'path': p, 'message': str(e)})",
    "if errors:",
    "    sys.stderr.write(json.dumps(errors))",
    "    sys.exit(1)",
  ].join("\n")

  const msg = await spawnAsync("python3", ["-c", script, ...paths], { silentMissing: true })
  if (!msg) return []

  // Try structured output; fall back to raw message.
  try {
    const parsed = JSON.parse(msg) as { path: string; message: string }[]
    return parsed.map((e) => ({ path: e.path, check: "check-yaml", message: e.message }))
  } catch {
    return [{ path: paths[0], check: "check-yaml", message: msg }]
  }
}

// ---------------------------------------------------------------------------
// Pure-JS checks (synchronous, no subprocess)
// ---------------------------------------------------------------------------

function runJsonCheck(path: string): CheckFailure[] {
  try {
    JSON.parse(readFileSync(path, "utf-8"))
    return []
  } catch (error) {
    return [{ path, check: "check-json", message: errorMessage(error) }]
  }
}

function runLargeFileCheck(path: string): CheckFailure[] {
  try {
    const { size } = statSync(path)
    if (size <= LARGE_FILE_LIMIT_BYTES) return []
    const mb = (size / 1_048_576).toFixed(1)
    return [{ path, check: "check-added-large-files", message: `File is ${mb} MB — limit is 5 MB` }]
  } catch {
    return []
  }
}

function runNewlineCheck(path: string): CheckFailure[] {
  let data: Buffer
  try {
    data = readFileSync(path)
  } catch (error) {
    return [{ path, check: "end-of-file", message: errorMessage(error) }]
  }

  if (data.length === 0) return []
  if (data.includes(0)) return [] // binary
  if (data[data.length - 1] === 0x0a) return []

  return [{ path, check: "end-of-file", message: "file does not end with a newline" }]
}

// ---------------------------------------------------------------------------
// mypy daemon (dmypy)
// ---------------------------------------------------------------------------

/**
 * Parse mypy target directories from .pre-commit-config.yaml.
 * Looks for hooks whose id starts with "mypy-" and extracts the directory
 * from the entry command (last argument after --ignore-missing-imports).
 * Only returns directories that exist on disk.
 */
function parseMypyDirs(directory: string): string[] {
  const configPath = resolve(directory, ".pre-commit-config.yaml")
  if (!existsSync(configPath)) return []

  try {
    const content = readFileSync(configPath, "utf-8")
    const dirs: string[] = []

    // Split into hook blocks and find mypy-* ones
    const hookBlocks = content.split(/(?=[ \t]+-[ \t]+id:)/)
    for (const block of hookBlocks) {
      if (!/id:\s*mypy-/.test(block)) continue
      const entryMatch = /entry:\s*(.+)/.exec(block)
      if (!entryMatch) continue

      // Entry format: bash -c '... .venv/bin/mypy --strict --ignore-missing-imports <dir>'
      // The directory is the last word after --ignore-missing-imports
      const dirMatch = /--ignore-missing-imports\s+([\w][\w/-]*)/.exec(entryMatch[1])
      if (!dirMatch) continue

      const absDir = resolve(directory, dirMatch[1])
      if (existsSync(absDir)) dirs.push(absDir)
    }

    return dirs
  } catch {
    return []
  }
}

/**
 * Run dmypy (mypy daemon) on the given directories.
 * On first call (~16s): starts the daemon and does a full analysis.
 * On subsequent calls (~0.5s): incremental re-check using the running daemon.
 *
 * dmypy outputs type errors to stdout and daemon messages to stderr,
 * so preferStdout is set to capture errors correctly.
 */
async function runMypyDaemon(dirs: string[], directory: string): Promise<CheckFailure[]> {
  const dmypyBin = resolve(directory, ".venv/bin/dmypy")
  const cmd = existsSync(dmypyBin) ? dmypyBin : "dmypy"

  const msg = await spawnAsync(
    cmd,
    ["run", "--", "--strict", "--ignore-missing-imports", "--show-column-numbers", "--no-error-summary", "--no-pretty", "--no-color-output", ...dirs],
    { timeout: 120_000, silentMissing: true, preferStdout: true },
  )
  if (!msg) return []

  // mypy/dmypy output: file:line:col: error: message [error-code]
  const lineRe = /^(.+?):(\d+):(\d+):\s+error:\s+(.+)$/
  const failures: CheckFailure[] = []
  for (const line of msg.split("\n")) {
    const m = lineRe.exec(line.trim())
    if (m) {
      failures.push({
        path: resolve(directory, m[1]),
        check: "mypy",
        message: m[4],
        line: parseInt(m[2], 10) - 1,
        character: parseInt(m[3], 10) - 1,
      })
    }
  }
  return failures
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Spawn a process asynchronously (non-blocking).
 * Returns null on success, or the captured error message on non-zero exit.
 */
function spawnAsync(cmd: string, args: string[], opts: SpawnOptions = {}): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(cmd, args, { encoding: "utf-8", timeout: opts.timeout ?? 15_000 }, (error, stdout, stderr) => {
      if (!error) {
        resolve(null)
        return
      }

      const err = error as NodeJS.ErrnoException
      if (opts.silentMissing && err.code === "ENOENT") {
        resolve(null)
        return
      }

      const errText = stderr.trim()
      const outText = stdout.trim()
      resolve(
        opts.preferStdout
          ? outText || errText || error.message || `${cmd} failed`
          : errText || outText || error.message || `${cmd} failed`,
      )
    })
  })
}

/** Build metadata.diagnostics consumed by the OpenCode TUI (shown below the diff). */
function toUIDiagnostics(failures: CheckFailure[]): Record<string, Diagnostic[]> {
  const result: Record<string, Diagnostic[]> = {}
  for (const f of failures) {
    const line = f.line ?? 0
    const char = f.character ?? 0
    const diag: Diagnostic = {
      range: {
        start: { line, character: char },
        end: { line, character: char },
      },
      message: `[${f.check}] ${f.message}`,
      severity: 1,
    }
    ;(result[f.path] ??= []).push(diag)
  }
  return result
}

/** Format failures as a block the model can read and act on. */
function formatReport(failures: CheckFailure[], directory: string): string {
  const lines = [
    `⚠️  post-edit-checks: ${failures.length} issue(s) found — please fix before continuing.`,
    "",
  ]
  for (const f of failures) {
    const displayPath = relative(directory, f.path) || f.path
    const location = f.line !== undefined ? `:${f.line + 1}:${(f.character ?? 0) + 1}` : ""
    lines.push(`• [${f.check}] ${displayPath}${location}`)
    for (const line of f.message.trim().split("\n")) {
      lines.push(`  ${line}`)
    }
  }
  return lines.join("\n")
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
