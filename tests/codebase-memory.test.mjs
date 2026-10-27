import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { createReadStream } from "node:fs"
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { delimiter, join, resolve } from "node:path"
import { test } from "node:test"
import { promisify } from "node:util"
import ts from "typescript"
import yauzl from "yauzl"

const execFileAsync = promisify(execFile)
const binDir = resolve("src/plugins/codebase-memory/bin")

async function loadModule(path) {
  const source = await readFile(path, "utf8")
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`)
}

const { bundledReleases, getBundledRelease, ensureBundledBinary } = await loadModule("src/plugins/codebase-memory/binary.ts")
const { normalizeProjectPath } = await loadModule("src/plugins/codebase-memory/paths.ts")

test("all bundled SHA-256 values have a valid format", () => {
  for (const [platform, release] of Object.entries(bundledReleases)) {
    for (const key of ["archiveSha256", "binarySha256"]) {
      assert.match(release[key], /^[0-9a-f]{64}$/, `${platform} ${key}`)
    }
  }
})

test("Windows x64 executable matches its checksum", { timeout: 180_000 }, async () => {
  const release = getBundledRelease("win32", "x64")
  const digest = await new Promise((resolve, reject) => {
    yauzl.open(join(binDir, release.archive), { lazyEntries: true }, (error, zip) => {
      if (error) return reject(error)
      zip.on("error", reject)
      zip.on("end", () => reject(new Error("Windows executable not found in archive")))
      zip.on("entry", (entry) => {
        if (entry.fileName !== "codebase-memory-mcp.exe") return zip.readEntry()
        zip.openReadStream(entry, async (error, stream) => {
          if (error) { zip.close(); return reject(error) }
          try {
            const hash = createHash("sha256")
            for await (const chunk of stream) hash.update(chunk)
            resolve(hash.digest("hex"))
          } catch (error) {
            reject(error)
          } finally {
            zip.close()
          }
        })
      })
      zip.readEntry()
    })
  })
  assert.equal(digest, release.binarySha256)
})

test("Windows releases are bundled and checksum verified", async () => {
  for (const arch of ["x64", "arm64"]) {
    const release = getBundledRelease("win32", arch)
    const hash = createHash("sha256")
    for await (const chunk of createReadStream(join(binDir, release.archive))) hash.update(chunk)
    assert.equal(hash.digest("hex"), release.archiveSha256)
  }
  assert.throws(() => getBundledRelease("win32", "ia32"), /No bundled/)
})

test("project paths handle Windows casing, separators, and roots", () => {
  assert.equal(normalizeProjectPath("C:/Work/Repo/", "win32"), normalizeProjectPath("c:\\work\\repo", "win32"))
  assert.equal(normalizeProjectPath("C:/", "win32"), normalizeProjectPath("c:\\", "win32"))
  assert.notEqual(normalizeProjectPath("C:/", "win32"), normalizeProjectPath("c:", "win32"))
  assert.notEqual(normalizeProjectPath("/Work/Repo", "linux"), normalizeProjectPath("/work/repo", "linux"))
})

test("extracts and runs the bundled executable", { timeout: 180_000 }, async (t) => {
  let release
  try { release = getBundledRelease() } catch { return t.skip("No bundled release for this platform") }
  const directory = await mkdtemp(join(tmpdir(), "cbm-suite-test-"))
  try {
    await copyFile(join(binDir, release.archive), join(directory, release.archive))
    const binary = await ensureBundledBinary(directory)
    assert.equal((await execFileAsync(binary, ["--version"])).stdout.trim(), "codebase-memory-mcp 0.11.0")
    assert.equal(await ensureBundledBinary(directory), binary)
    if (process.platform === "win32") {
      const wrapper = join(binDir, "opencode-cbm.cmd")
      const env = { ...process.env, CBM: "opencode-cbm", CBM_BINARY: binary, PATH: `${binDir}${delimiter}${process.env.PATH}` }
      const result = await execFileAsync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `""${wrapper}" --help"`], {
        env,
      })
      assert.match(result.stdout, /usage|help/i)
      const powershell = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", "& $env:CBM --help"], { env })
      assert.match(powershell.stdout, /usage|help/i)
      const bash = await execFileAsync("bash.exe", ["-c", '$CBM --help'], { env })
      assert.match(bash.stdout, /usage|help/i)
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
