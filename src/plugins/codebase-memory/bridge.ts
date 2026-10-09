import { chmod, mkdtemp, realpath, rm } from "node:fs/promises"
import { rmSync } from "node:fs"
import { connect, createServer, type Socket } from "node:net"
import { tmpdir } from "node:os"
import { isAbsolute, join } from "node:path"
import { runCLI, type CLIOutput } from "./cli.js"
import { MCPSession } from "./mcp-session.js"

type Entry = { ready: Promise<MCPSession>; session: MCPSession; users: number; touched: number }
type Request = { argv: string[]; cwd: string; stdinTTY: boolean; timeout: number; env: Record<string, string | null> }
const environmentKeys = ["CBM_BINARY", "CBM_ALLOWED_ROOT", "CBM_CACHE_DIR", "CBM_RUNTIME_DIR", "CBM_LOG_LEVEL", "CBM_MEM_BUDGET_MB"]

export async function createCLIBridge(binary: string): Promise<{ socket: string; warm: (cwd: string) => Promise<void>; close: () => Promise<void> }> {
  const directory = await mkdtemp(join(tmpdir(), "oc-cbm-"))
  await chmod(directory, 0o700)
  const socketPath = join(directory, "s")
  const clients = new Map<string, Entry>()
  const sockets = new Set<Socket>()
  const sessionEnvironment: NodeJS.ProcessEnv = { ...process.env, CBM_LOG_LEVEL: process.env.CBM_LOG_LEVEL ?? "error" }
  const environment = Object.fromEntries(environmentKeys.map((key) => [key,
    key === "CBM_BINARY" ? binary : sessionEnvironment[key] ?? null,
  ]))
  let closed = false

  async function acquire(cwd: string): Promise<Entry> {
    cwd = await realpath(cwd)
    if (closed) throw new Error("CBM bridge is closing")
    let entry = clients.get(cwd)
    if (entry && !entry.session.alive) { clients.delete(cwd); entry = undefined }
    if (!entry) {
      if (clients.size >= 8) {
        const idle = [...clients.entries()].filter(([, candidate]) => !candidate.users)
          .sort((a, b) => a[1].touched - b[1].touched)[0]
        if (!idle) throw new Error("CBM bridge is busy in 8 working directories; retry later")
        idle[1].session.close()
        clients.delete(idle[0])
      }
      const session = new MCPSession(binary, cwd, sessionEnvironment)
      entry = { session, ready: session.initialize().then(() => session), users: 0, touched: Date.now() }
      clients.set(cwd, entry)
      const current = entry
      void current.ready.catch(() => {
        session.close()
        if (clients.get(cwd) === current) clients.delete(cwd)
      })
    }
    entry.users++
    entry.touched = Date.now()
    return entry
  }

  async function warm(cwd: string): Promise<void> {
    const entry = await acquire(cwd)
    try {
      await entry.ready
    } finally {
      entry.users--
      entry.touched = Date.now()
    }
  }

  const server = createServer((socket) => {
    sockets.add(socket)
    socket.setEncoding("utf8")
    socket.setTimeout(30_000, () => socket.destroy())
    const abort = new AbortController()
    let buffer = ""
    let started = false
    let finished = false
    let input: { resolve: (text: string) => void; reject: (error: Error) => void } | undefined
    const reply = (result: CLIOutput) => {
      if (finished) return
      finished = true
      if (!socket.destroyed) socket.end(JSON.stringify({ type: "result", ...result }) + "\n")
    }

    async function execute(request: Request) {
      let entry: Entry | undefined
      const cancelStartup = () => {
        if (entry && entry.users === 1 && !entry.session.initialized) entry.session.close(new Error("CBM startup cancelled"))
      }
      abort.signal.addEventListener("abort", cancelStartup, { once: true })
      try {
        if (environmentKeys.some((key) => request.env[key] !== environment[key])) {
          // Preserve per-command cache/root/binary overrides without broadening MCP session policy.
          finished = true
          socket.end(JSON.stringify({ type: "native" }) + "\n")
          return
        }
        entry = await acquire(request.cwd)
        if (abort.signal.aborted) cancelStartup()
        const session = await entry.ready
        if (abort.signal.aborted) return
        const result = await runCLI(request.argv, request.cwd, session.tools, () => {
          if (request.stdinTTY) return Promise.resolve("")
          return new Promise<string>((resolve, reject) => {
            input = { resolve, reject }
            socket.write(JSON.stringify({ type: "stdin" }) + "\n")
          })
        }, (name, args) => session.call(name, args, abort.signal, request.timeout))
        reply(result)
      } catch (error: unknown) {
        reply({ stdout: "", stderr: `CBM bridge: ${error instanceof Error ? error.message : String(error)}\n`, exitCode: 1 })
      } finally {
        abort.signal.removeEventListener("abort", cancelStartup)
        if (entry) { entry.users--; entry.touched = Date.now() }
      }
    }

    socket.on("data", (chunk: string) => {
      buffer += chunk
      if (buffer.length > 2 * 1024 * 1024) { socket.destroy(); return }
      let newline: number
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline)
        buffer = buffer.slice(newline + 1)
        try {
          const message = JSON.parse(line)
          if (!started) {
            if (!Array.isArray(message.argv) || message.argv.length > 512 || !message.argv.every((arg: unknown) => typeof arg === "string") ||
                typeof message.cwd !== "string" || !isAbsolute(message.cwd) || typeof message.stdinTTY !== "boolean" ||
                !message.env || environmentKeys.some((key) => message.env[key] !== null && typeof message.env[key] !== "string") ||
                !Number.isSafeInteger(message.timeout) || message.timeout < 1 || message.timeout > 86_400_000) {
              throw new Error("Invalid CLI request")
            }
            started = true
            socket.setTimeout(message.timeout + 30_000)
            void execute(message)
          } else if (input && message.type === "stdin" && typeof message.text === "string" && message.text.length <= 1024 * 1024) {
            input.resolve(message.text)
            input = undefined
          } else {
            throw new Error("Unexpected bridge message")
          }
        } catch (error) {
          abort.abort()
          reply({ stdout: "", stderr: `CBM bridge: ${String(error)}\n`, exitCode: 1 })
          return
        }
      }
    })
    socket.on("error", () => {})
    socket.on("close", () => {
      sockets.delete(socket)
      input?.reject(new Error("CLI disconnected"))
      if (!finished) abort.abort()
    })
  })

  const onExit = () => {
    for (const entry of clients.values()) entry.session.child.kill("SIGKILL")
    rmSync(directory, { recursive: true, force: true })
  }
  const close = async () => {
    if (closed) return
    closed = true
    process.removeListener("exit", onExit)
    for (const socket of sockets) socket.destroy()
    for (const entry of clients.values()) entry.session.close()
    clients.clear()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await rm(directory, { recursive: true, force: true })
  }

  try {
    // Darwin's sockaddr_un path limit is 104 bytes including the terminator.

    if (Buffer.byteLength(socketPath) >= 104) throw new Error("Temporary directory path is too long for a CBM Unix socket")
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(socketPath, () => { server.removeListener("error", reject); resolve() })
    })
    await chmod(socketPath, 0o600)
    server.on("error", (error) => console.warn(`CBM bridge socket failed: ${error.message}`))
    process.once("exit", onExit)
    return { socket: socketPath, warm, close }
  } catch (error) {
    await close()
    throw error
  }
}

export function callBridge(socket: string, binary: string, argv: string[], cwd: string, timeout = 60_000): Promise<CLIOutput | undefined> {
  const env: NodeJS.ProcessEnv = { ...process.env, CBM_LOG_LEVEL: process.env.CBM_LOG_LEVEL ?? "error" }
  const request = {
    argv,
    cwd,
    stdinTTY: true,
    timeout,
    env: Object.fromEntries(environmentKeys.map((key) => [key, key === "CBM_BINARY" ? binary : env[key] ?? null])),
  }
  return new Promise((resolve, reject) => {
    const client = connect(socket)
    let buffer = ""
    client.setEncoding("utf8")
    client.setTimeout(timeout + 30_000, () => client.destroy(new Error("CBM bridge timed out")))
    client.on("connect", () => client.write(JSON.stringify(request) + "\n"))
    client.on("data", (chunk: string) => {
      buffer += chunk
      const newline = buffer.indexOf("\n")
      if (newline < 0) return
      const message = JSON.parse(buffer.slice(0, newline)) as CLIOutput & { type: string }
      client.destroy()
      resolve(message.type === "native" ? undefined : message)
    })
    client.on("error", reject)
    client.on("close", () => reject(new Error("CBM bridge closed without a result")))
  })
}
