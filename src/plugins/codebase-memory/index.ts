import { createReadStream } from "node:fs"
import { createHash } from "node:crypto"
import { chmod, lstat, mkdir, mkdtemp, readFile, rename, rm } from "node:fs/promises"
import { execFile } from "node:child_process"
import { dirname, join } from "node:path"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode/plugin"

const execFileAsync = promisify(execFile)
const pluginDir = dirname(fileURLToPath(import.meta.url))
const binDir = join(pluginDir, "bin")
const archivePath = join(binDir, "codebase-memory-mcp-linux-amd64-portable-v0.11.0.tar.gz")
const runtimeDir = join(binDir, ".runtime-v0.11.0")
const defaultBinary = join(runtimeDir, "codebase-memory-mcp")
const expectedVersion = "codebase-memory-mcp 0.11.0"
const expectedArchiveSha256 = "1f9e8293eb2bc5c05cfa27a7e8fc033da6d729ffad525ccfcdaa3fd606306683"
const expectedBinarySha256 = "ce11c141431aeadd788506c3a7e6942db8fd438dec369d0707a39ec9fd8c6510"
const expectedArchiveMembers = [
  "codebase-memory-mcp",
  "LICENSE",
  "install.sh",
  "THIRD_PARTY_NOTICES.md",
]

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256")
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest("hex")
}

async function hasExpectedVersion(path: string): Promise<boolean> {
  try {
    const status = await lstat(path)
    if (!status.isFile() || status.isSymbolicLink()) return false
    const { stdout } = await execFileAsync(path, ["--version"], { timeout: 15_000 })
    return stdout.trim() === expectedVersion
  } catch {
    return false
  }
}

async function ensureBundledBinary(): Promise<string> {
  if (await hasExpectedVersion(defaultBinary)) return defaultBinary

  const archiveSha256 = await sha256File(archivePath)
  if (archiveSha256 !== expectedArchiveSha256) {
    throw new Error(`Codebase Memory release archive checksum mismatch: ${archiveSha256}`)
  }

  const { stdout: listing } = await execFileAsync("tar", ["-tzf", archivePath], {
    maxBuffer: 64 * 1024,
    timeout: 30_000,
  })
  const members = listing.trimEnd().split(/\r?\n/)
  if (members.length !== expectedArchiveMembers.length ||
      expectedArchiveMembers.some((member) => !members.includes(member))) {
    throw new Error("Codebase Memory release archive has an unexpected file list")
  }

  const stagingDir = await mkdtemp(join(binDir, ".extract-"))
  try {
    await chmod(stagingDir, 0o700)
    await execFileAsync("tar", ["-xzf", archivePath, "-C", stagingDir, "codebase-memory-mcp"], {
      maxBuffer: 64 * 1024,
      timeout: 60_000,
    })

    const candidate = join(stagingDir, "codebase-memory-mcp")
    const candidateStatus = await lstat(candidate)
    if (!candidateStatus.isFile() || candidateStatus.isSymbolicLink()) {
      throw new Error("Extracted Codebase Memory executable is not a regular file")
    }
    await chmod(candidate, 0o755)

    const binarySha256 = await sha256File(candidate)
    if (binarySha256 !== expectedBinarySha256) {
      throw new Error(`Extracted Codebase Memory executable checksum mismatch: ${binarySha256}`)
    }
    if (!(await hasExpectedVersion(candidate))) {
      throw new Error(`Extracted Codebase Memory executable is not ${expectedVersion}`)
    }

    await mkdir(runtimeDir, { recursive: true, mode: 0o700 })
    const runtimeStatus = await lstat(runtimeDir)
    if (!runtimeStatus.isDirectory() || runtimeStatus.isSymbolicLink()) {
      throw new Error("Codebase Memory runtime path must be a real directory")
    }
    await chmod(runtimeDir, 0o700)
    await rename(candidate, defaultBinary)
    return defaultBinary
  } finally {
    await rm(stagingDir, { recursive: true, force: true })
  }
}

export async function initializeCodebaseMemory(ctx: Plugin.Context): Promise<void> {
  const binary = process.env.CBM_BINARY || await ensureBundledBinary()
  const systemPrompt = await readFile(join(pluginDir, "system-prompt.md"), "utf8")

  await ctx.session.hook("context", (event) => {
    event.system.push({ type: "text", text: systemPrompt })
  })

  await execFileAsync(binary, ["daemon", "start"]).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Codebase Memory daemon startup failed: ${message}`)
  })

  await ctx.shell.hook("create.before", (event) => {
    event.env.CBM = `${binary} cli`
    event.env.CBM_LOG_LEVEL ??= process.env.CBM_LOG_LEVEL ?? "error"
  })
}
