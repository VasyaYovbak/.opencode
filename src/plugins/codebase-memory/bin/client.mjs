import { spawn } from "node:child_process"
import { createConnection } from "node:net"

const argv = process.argv.slice(2)
const timeout = Number(process.env.CBM_TIMEOUT_MS ?? 600_000)
if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 86_400_000) {
  console.error("CBM_TIMEOUT_MS must be an integer from 1 to 86400000")
  process.exit(1)
}
const socket = createConnection(process.env.CBM_SOCKET)
socket.setEncoding("utf8")
socket.setTimeout(timeout + 30_000)
let connected = false
let completed = false
let buffer = ""
let nativeChild

function runNative() {
  completed = true
  socket.destroy()
  nativeChild = spawn(process.env.CBM_BINARY, ["cli", ...argv], { stdio: "inherit" })
  nativeChild.on("error", (error) => { console.error(error.message); process.exitCode = 1 })
  nativeChild.on("exit", (code) => { process.exitCode = code ?? 1 })
}

function fail(message) {
  if (completed) return
  completed = true
  console.error(`CBM bridge: ${message}; command was not retried`)
  socket.destroy()
  process.stdin.destroy()
  process.exitCode = 1
}

async function readStdin() {
  const chunks = []
  let bytes = 0
  for await (const chunk of process.stdin) {
    bytes += chunk.length
    if (bytes > 1024 * 1024) throw new Error("Stdin exceeds 1 MiB")
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString("utf8")
}

socket.on("connect", () => {
  connected = true
  const keys = ["CBM_BINARY", "CBM_ALLOWED_ROOT", "CBM_CACHE_DIR", "CBM_RUNTIME_DIR", "CBM_LOG_LEVEL", "CBM_MEM_BUDGET_MB"]
  const env = Object.fromEntries(keys.map((key) => [key, process.env[key] ?? null]))
  socket.write(JSON.stringify({ argv, cwd: process.cwd(), stdinTTY: Boolean(process.stdin.isTTY), timeout, env }) + "\n")
})
socket.on("data", (chunk) => {
  buffer += chunk
  if (buffer.length > 64 * 1024 * 1024) { fail("Response exceeds 64 MiB"); return }
  let newline
  while ((newline = buffer.indexOf("\n")) >= 0) {
    if (completed) break
    const line = buffer.slice(0, newline)
    buffer = buffer.slice(newline + 1)
    try {
      const message = JSON.parse(line)
      if (message.type === "stdin") {
        void readStdin().then((text) => {
          if (!socket.destroyed) socket.write(JSON.stringify({ type: "stdin", text }) + "\n")
        }).catch((error) => fail(error.message))
      } else if (message.type === "native") {
        runNative()
      } else if (message.type === "result" && typeof message.stdout === "string" && typeof message.stderr === "string" &&
                 Number.isInteger(message.exitCode) && message.exitCode >= 0 && message.exitCode <= 255) {
        completed = true
        process.stdout.write(message.stdout)
        process.stderr.write(message.stderr)
        process.exitCode = message.exitCode
        socket.end()
      } else {
        fail("Invalid bridge response")
      }
    } catch (error) { fail(error.message) }
  }
})
socket.on("timeout", () => fail("Request timed out"))
socket.on("end", () => { if (!completed) fail("Connection closed before a response") })
socket.on("close", () => { if (!completed) fail("Connection closed before a response") })
socket.on("error", (error) => {
  if (!connected && !completed) {
    // Nothing was sent: a stale socket can safely fall back to the original CLI.
    runNative()
  } else { fail(error.message) }
})
for (const [signal, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  process.once(signal, () => { nativeChild?.kill(signal); socket.destroy(); process.exit(code) })
}
