import { createReadStream } from "node:fs"
import { createHash } from "node:crypto"
import { chmod, lstat, mkdir, mkdtemp, rename, rm } from "node:fs/promises"
import { execFile } from "node:child_process"
import { join } from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const expectedVersion = "codebase-memory-mcp 0.11.0"
const expectedArchiveMembers = [
  "codebase-memory-mcp",
  "LICENSE",
  "install.sh",
  "THIRD_PARTY_NOTICES.md",
]

type BundledRelease = {
  archive: string
  archiveSha256: string
  binarySha256: string
}

const bundledReleases: Partial<Record<string, BundledRelease>> = {
  "linux-x64": {
    archive: "codebase-memory-mcp-linux-amd64-portable-v0.11.0.tar.gz",
    archiveSha256: "1f9e8293eb2bc5c05cfa27a7e8fc033da6d729ffad525ccfcdaa3fd606306683",
    binarySha256: "ce11c141431aeadd788506c3a7e6942db8fd438dec369d0707a39ec9fd8c6510",
  },
  "darwin-arm64": {
    archive: "codebase-memory-mcp-darwin-arm64-v0.11.0.tar.gz",
    archiveSha256: "4dee7f38b63740e6751d7a7ed7eb10291c1f2a3ea2415f599dc68370ca0a2d18",
    binarySha256: "a67b7ccead5d2ca852051f8619458ab96af41393257b56fb36e523a110265d48",
  },
  "darwin-x64": {
    archive: "codebase-memory-mcp-darwin-amd64-v0.11.0.tar.gz",
    archiveSha256: "dbf1c73bfcbde64e7dde4cd1320da7afc02e2c972ee1789ae039521411f5132e",
    binarySha256: "69ca71b4b62fe233677851bdf54953e2a6660cf5d687b4d64226b2591b14ed39",
  },
}

export function getBundledRelease(platform: string = process.platform, arch: string = process.arch): BundledRelease {
  const release = bundledReleases[`${platform}-${arch}`]
  if (!release) {
    throw new Error(
      `No bundled Codebase Memory 0.11.0 binary for ${platform}/${arch}. ` +
      "Set CBM_BINARY in the OpenCode server environment to a compatible executable.",
    )
  }
  return release
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256")
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest("hex")
}

export async function verifyBinaryVersion(path: string): Promise<void> {
  const status = await lstat(path)
  if (!status.isFile() || status.isSymbolicLink()) {
    throw new Error(`Codebase Memory executable is not a regular file: ${path}`)
  }

  let version: string
  try {
    const { stdout } = await execFileAsync(path, ["--version"], { timeout: 15_000 })
    version = stdout.trim()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Cannot run Codebase Memory executable ${path} on ${process.platform}/${process.arch}: ${message}`,
      { cause: error },
    )
  }
  if (version !== expectedVersion) {
    throw new Error(`Codebase Memory executable ${path} reports ${JSON.stringify(version)}; expected ${expectedVersion}`)
  }
}

export async function ensureBundledBinary(binDir: string): Promise<string> {
  const release = getBundledRelease()
  const archivePath = join(binDir, release.archive)
  const runtimeDir = join(binDir, `.runtime-v0.11.0-${process.platform}-${process.arch}`)
  const defaultBinary = join(runtimeDir, "codebase-memory-mcp")
  const validRuntime = await verifyBinaryVersion(defaultBinary).then(() => true, () => false)
  if (validRuntime) return defaultBinary

  const archiveSha256 = await sha256File(archivePath)
  if (archiveSha256 !== release.archiveSha256) {
    throw new Error(`Codebase Memory release archive checksum mismatch (${release.archive}): ${archiveSha256}`)
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
    if (binarySha256 !== release.binarySha256) {
      throw new Error(`Extracted Codebase Memory executable checksum mismatch: ${binarySha256}`)
    }
    await verifyBinaryVersion(candidate)

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
