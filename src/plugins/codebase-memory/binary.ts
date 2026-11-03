import { createReadStream } from "node:fs"
import { createHash } from "node:crypto"
import { chmod, lstat, mkdir, mkdtemp, rename, rm } from "node:fs/promises"
import { execFile } from "node:child_process"
import { join } from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const releaseVersion = "0.12.1"
const expectedVersion = `codebase-memory-mcp ${releaseVersion}`
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
  windows?: boolean
}

export const bundledReleases: Readonly<Partial<Record<string, BundledRelease>>> = {
  "linux-x64": {
    archive: "codebase-memory-mcp-linux-amd64-portable-v0.12.1.tar.gz",
    archiveSha256: "8c3d0341064301e78ecc84cf7348d4e2c6562a0f57448243ea560aaa34de36c1",
    binarySha256: "77745491f0a9c346d6da23eed4d92b5feaa31a27a883c9faa4fa9f47c8183705",
  },
  "darwin-arm64": {
    archive: "codebase-memory-mcp-darwin-arm64-v0.12.1.tar.gz",
    archiveSha256: "9bfcbe38414b47969a3e1d1c1999f5357409387c86fa3d24221b5458267660d2",
    binarySha256: "a36cfa1f5d10d8c4762501d63feef082711aae4704b9e8f9066db52779a8601e",
  },
  "darwin-x64": {
    archive: "codebase-memory-mcp-darwin-amd64-v0.12.1.tar.gz",
    archiveSha256: "ca6e64397a8ae80cec898a8205a6aa16750ac798acc05a0c3ed983837944a581",
    binarySha256: "f3ba4d7dd462be868eff85f0dccb7375405f58084da800826065df2312b028ab",
  },
  "win32-x64": {
    archive: "codebase-memory-mcp-windows-amd64-v0.12.1.zip",
    archiveSha256: "4e4e0f16b45233af5c757a1fcbe3c3b16e9056375b1fbe2ce020b6de75dedcc0",
    binarySha256: "39f6a789cd858d7428561ac5afaefb9a47b018dcba0ad6fa41ae71a45e0ed656",
    windows: true,
  },
  "win32-arm64": {
    archive: "codebase-memory-mcp-windows-arm64-v0.12.1.zip",
    archiveSha256: "934ab6bd67a76c6ebd9e110d87b7090ffd629919bedaeddabe5a19175038b063",
    binarySha256: "b19816bb88ef3145a0f4b81856665c67a684cc038e06ae696e76960277c67b41",
    windows: true,
  },
}

export function getBundledRelease(platform: string = process.platform, arch: string = process.arch): BundledRelease {
  const release = bundledReleases[`${platform}-${arch}`]
  if (!release) {
    throw new Error(
      `No bundled Codebase Memory ${releaseVersion} binary for ${platform}/${arch}. ` +
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
    const { stdout } = await execFileAsync(path, ["--version"], { timeout: 15_000, windowsHide: true })
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
  const runtimeDir = join(binDir, `.runtime-v${releaseVersion}-${process.platform}-${process.arch}`)
  const binaryName = release.windows ? "codebase-memory-mcp.exe" : "codebase-memory-mcp"
  const defaultBinary = join(runtimeDir, binaryName)
  const validRuntime = await verifyBinaryVersion(defaultBinary).then(() => true, () => false)
  if (validRuntime) return defaultBinary

  const archiveSha256 = await sha256File(archivePath)
  if (archiveSha256 !== release.archiveSha256) {
    throw new Error(`Codebase Memory release archive checksum mismatch (${release.archive}): ${archiveSha256}`)
  }

  const { stdout: listing } = await execFileAsync("tar", [release.windows ? "-tf" : "-tzf", archivePath], {
    maxBuffer: 64 * 1024,
    timeout: 30_000,
    windowsHide: true,
  })
  const members = listing.trimEnd().split(/\r?\n/)
  const expectedMembers = release.windows
    ? [binaryName, "LICENSE", "install.ps1", "THIRD_PARTY_NOTICES.md"]
    : expectedArchiveMembers
  if (members.length !== expectedMembers.length ||
      expectedMembers.some((member) => !members.includes(member))) {
    throw new Error("Codebase Memory release archive has an unexpected file list")
  }

  const stagingDir = await mkdtemp(join(binDir, ".extract-"))
  try {
    await chmod(stagingDir, 0o700)
    await execFileAsync("tar", [release.windows ? "-xf" : "-xzf", archivePath, "-C", stagingDir, binaryName], {
      maxBuffer: 64 * 1024,
      timeout: 60_000,
      windowsHide: true,
    })

    const candidate = join(stagingDir, binaryName)
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
