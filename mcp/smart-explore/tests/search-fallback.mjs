import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const execFileAsync = promisify(execFile);
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cliPath = join(packageRoot, "scripts", "smart-explore.cjs");
const mcpPath = join(packageRoot, "scripts", "mcp-server.cjs");
const projectRoot = await mkdtemp(join(tmpdir(), "smart-explore-fallback-"));
let mcpClient = null;
let activeRequests = 0;
let maxActiveRequests = 0;

const server = createServer(async (request, response) => {
  activeRequests++;
  maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
  let body = "";
  for await (const chunk of request) body += chunk;
  await new Promise((resolve) => setTimeout(resolve, 50));
  const inputs = JSON.parse(body).input;
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({
    data: inputs.map((input, index) => ({
      index,
      embedding: input.startsWith("Instruct:") || input.includes("semanticDistractor")
        ? [1, 0, 0, 0]
        : [0, 1, 0, 0],
    })),
  }));
  activeRequests--;
});

try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address === "object");

  await writeFile(join(projectRoot, ".smart-explore.json"), JSON.stringify({
    embedding: {
      baseUrl: `http://127.0.0.1:${address.port}/v1`,
      model: "test-embedding",
      dim: 4,
      maxConcurrency: 2,
    },
  }));
  await writeFile(join(projectRoot, "aaa.ts"), "export function semanticDistractor() { return 'vector-only winner'; }\n");
  await writeFile(join(projectRoot, "cache.ts"), "export function cacheResult() { return 'available offline'; }\n");

  await execFileAsync(process.execPath, [cliPath, "index"], { cwd: projectRoot });
  const hybrid = await execFileAsync(process.execPath, [cliPath, "search", "cache", "--max-results", "1", "--show-scores"], { cwd: projectRoot });
  assert.match(hybrid.stdout, /hybrid search/);
  assert.match(hybrid.stdout, /cacheResult/);
  assert.match(hybrid.stdout, /\[RRF: \d+\.\d{4}\]/);

  mcpClient = new Client({ name: "score-test", version: "1.0.0" });
  await mcpClient.connect(new StdioClientTransport({ command: process.execPath, args: [mcpPath], cwd: projectRoot, stderr: "pipe" }));
  const mcpSearch = await mcpClient.callTool({ name: "smart_search", arguments: { query: "cache", include_scores: true } });
  const mcpText = mcpSearch.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
  assert.match(mcpText, /\[RRF: \d+\.\d{4}\]/);

  maxActiveRequests = 0;
  const multi = await execFileAsync(process.execPath, [cliPath, "search", "cacheResult", "available", "offline", "function"], { cwd: projectRoot });
  assert.equal(maxActiveRequests, 2);
  assert.doesNotMatch(multi.stdout, /\[(?:RRF|BM25|distance):/);

  const sourcePath = join(projectRoot, "cache.ts");
  await writeFile(sourcePath, "export function backdatedResult() { return 'mtime moved backwards'; }\n");
  const backdatedMtime = new Date(Date.now() - 86_400_000);
  await utimes(sourcePath, backdatedMtime, backdatedMtime);
  await execFileAsync(process.execPath, [cliPath, "index"], { cwd: projectRoot });
  const backdated = await execFileAsync(process.execPath, [cliPath, "search", "backdatedResult"], { cwd: projectRoot });
  assert.match(backdated.stdout, /backdatedResult/);

  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

  await writeFile(sourcePath, "export function replacementResult() { return 'embedding required'; }\n");
  await assert.rejects(
    execFileAsync(process.execPath, [cliPath, "index", "--force"], { cwd: projectRoot }),
    (error) => typeof error.stderr === "string" && error.stderr.includes("Indexing failed"),
  );

  const { stdout } = await execFileAsync(process.execPath, [cliPath, "search", "backdated", "--show-scores"], { cwd: projectRoot });
  assert.match(stdout, /BM25 fallback/);
  assert.match(stdout, /backdatedResult/);
  assert.match(stdout, /\[BM25: \d+\.\d{4}\]/);
} finally {
  await mcpClient?.close().catch(() => {});
  if (server.listening) await new Promise((resolve) => server.close(resolve));
  await rm(projectRoot, { recursive: true, force: true });
}
