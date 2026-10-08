import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { pathToFileURL } from "node:url"

export type InputSchema = {
  type?: string | string[]
  description?: string
  enum?: unknown[]
  default?: unknown
  properties?: Record<string, InputSchema>
  required?: string[]
  items?: InputSchema
}

export type MCPTool = { name: string; description?: string; inputSchema: InputSchema }
export type MCPResult = { content?: Array<{ type: string; text?: string }>; isError?: boolean }
type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void; finish: () => void }

export class MCPSession {
  readonly child: ChildProcessWithoutNullStreams
  readonly tools = new Map<string, MCPTool>()
  initialized = false
  private pending = new Map<number, Pending>()
  private nextID = 0
  private buffer = ""
  private stderr = ""
  private failure?: Error
  private stopping = false
  private queue: Promise<unknown> = Promise.resolve()
  private cwd: string

  constructor(binary: string, cwd: string, env: NodeJS.ProcessEnv = process.env) {
    this.cwd = cwd
    this.child = spawn(binary, [], {
      cwd,
      env: { ...env, CBM_LOG_LEVEL: env.CBM_LOG_LEVEL ?? "error" },
      stdio: "pipe",
    })
    this.child.stdout.setEncoding("utf8")
    this.child.stderr.setEncoding("utf8")
    this.child.stderr.on("data", (chunk: string) => { this.stderr = (this.stderr + chunk).slice(-4096) })
    this.child.stdout.on("data", (chunk: string) => this.receive(chunk))
    this.child.stdin.on("error", (error: Error) => this.fail(error))
    this.child.on("error", (error: Error) => this.fail(error))
    this.child.on("exit", (code, signal) => {
      this.fail(new Error(`CBM MCP exited (${signal ?? code}): ${this.stderr.trim()}`))
    })
  }

  get alive(): boolean { return !this.failure }

  async initialize(): Promise<void> {
    const deadline = performance.now() + 30_000
    const remaining = () => Math.max(1, Math.ceil(deadline - performance.now()))
    await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "opencode-cbm-cli-bridge", version: "1" },
    }, remaining())
    this.send({ jsonrpc: "2.0", method: "notifications/initialized" })
    let cursor: string | undefined
    do {
      const page = await this.request("tools/list", cursor ? { cursor } : {}, remaining()) as {
        tools: MCPTool[]; nextCursor?: string
      }
      for (const tool of page.tools) this.tools.set(tool.name, tool)
      cursor = page.nextCursor
    } while (cursor)
    this.initialized = true
  }

  call(name: string, args: Record<string, unknown>, signal: AbortSignal, timeout: number): Promise<MCPResult> {
    // One active request per frontend: cancellation cannot target another caller's work.
    const result = this.queue.then(async () => {
      if (signal.aborted) throw new Error("CBM command cancelled")
      return await this.request("tools/call", { name, arguments: args }, timeout, signal) as MCPResult
    })
    this.queue = result.catch(() => {})
    return result
  }

  private send(message: unknown): void {
    if (this.failure) throw this.failure
    this.child.stdin.write(JSON.stringify(message) + "\n")
  }

  private request(method: string, params: unknown, timeout: number, signal?: AbortSignal): Promise<unknown> {
    if (this.failure) return Promise.reject(this.failure)
    return new Promise((resolve, reject) => {
      const id = ++this.nextID
      const cancel = () => {
        try {
          this.send({ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: id, reason: "CLI disconnected or timed out" } })
        } catch {}
        // Never retry an interrupted call: it may already have mutated a graph.
        this.close(new Error("CBM command cancelled or timed out; it was not retried"))
      }
      const timer = setTimeout(cancel, timeout)
      const finish = () => {
        clearTimeout(timer)
        signal?.removeEventListener("abort", cancel)
      }
      this.pending.set(id, { resolve, reject, finish })
      signal?.addEventListener("abort", cancel, { once: true })
      if (signal?.aborted) { cancel(); return }
      try { this.send({ jsonrpc: "2.0", id, method, params }) } catch (error) {
        this.fail(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  private receive(chunk: string): void {
    this.buffer += chunk
    if (this.buffer.length > 64 * 1024 * 1024) {
      this.close(new Error("CBM MCP response exceeds 64 MiB"))
      return
    }
    let newline: number
    while ((newline = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, newline)
      this.buffer = this.buffer.slice(newline + 1)
      if (!line.trim()) continue
      try {
        const message = JSON.parse(line)
        if (message.method && message.id !== undefined) {
          if (message.method === "roots/list" || message.method === "ping") {
            this.send({ jsonrpc: "2.0", id: message.id, result: message.method === "ping" ? {} : { roots: [{ uri: pathToFileURL(this.cwd).href }] } })
          } else {
            this.send({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "Method not supported" } })
          }
          continue
        }
        const pending = this.pending.get(message.id)
        if (!pending) continue
        this.pending.delete(message.id)
        pending.finish()
        if (message.error) pending.reject(new Error(message.error.message ?? JSON.stringify(message.error)))
        else pending.resolve(message.result)
      } catch (error) {
        this.close(new Error(`Invalid CBM MCP response: ${String(error)}`))
        return
      }
    }
  }

  private fail(error: Error): void {
    if (this.failure) return
    this.failure = error
    for (const pending of this.pending.values()) { pending.finish(); pending.reject(error) }
    this.pending.clear()
    if (!this.stopping) this.close(error)
  }

  close(error = new Error("CBM bridge closed")): void {
    if (this.stopping) return
    this.stopping = true
    this.fail(error)
    this.child.stdin.end()
    if (this.child.exitCode !== null || this.child.signalCode !== null) return
    this.child.kill("SIGTERM")
    const kill = setTimeout(() => {
      if (this.child.exitCode === null && this.child.signalCode === null) this.child.kill("SIGKILL")
    }, 2000)
    kill.unref()
    this.child.once("exit", () => clearTimeout(kill))
  }
}
