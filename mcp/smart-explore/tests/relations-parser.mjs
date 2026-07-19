import assert from "node:assert/strict";
import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const serverPath = join(packageRoot, "scripts", "mcp-server.cjs");
const projectRoot = await mkdtemp(join(tmpdir(), "smart-explore-relations-"));
const callerPath = join(projectRoot, "caller.ts");
const client = new Client({ name: "relations-test", version: "1.0.0" });

const toolText = async (name, args) => {
  const result = await client.callTool({ name, arguments: args });
  return result.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
};

try {
  await writeFile(join(projectRoot, "a.ts"), "export function duplicate() { return 'a'; }\n");
  await writeFile(join(projectRoot, "b.ts"), "export function duplicate() { return 'b'; }\nexport function replacement() { return 'new'; }\n");
  await writeFile(callerPath, "import { duplicate } from './b';\nexport function invoke() { return duplicate(); }\n");
  await writeFile(join(projectRoot, "generator.ts"), "export async function* walkDir() {\n  yield 'entry';\n}\n");

  await client.connect(new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: projectRoot, stderr: "pipe" }));

  const duplicate = await toolText("smart_callers", { path: projectRoot, symbol_name: "duplicate" });
  assert.match(duplicate, /target: b\.ts:1/);
  assert.doesNotMatch(duplicate, /target: a\.ts:1/);

  await toolText("smart_callers", { path: projectRoot, symbol_name: "duplicate" });
  await writeFile(callerPath, "import { replacement } from './b';\nexport function invoke() { return replacement(); }\n");
  const changedTime = new Date(Date.now() + 2_000);
  await utimes(callerPath, changedTime, changedTime);
  const replacement = await toolText("smart_callers", { path: projectRoot, symbol_name: "replacement" });
  assert.match(replacement, /caller\.ts:2.*target: b\.ts:2/);

  const outline = await toolText("smart_outline", { file_path: join(projectRoot, "generator.ts") });
  assert.match(outline, /walkDir/);
  const unfolded = await toolText("smart_unfold", { file_path: join(projectRoot, "generator.ts"), symbol_name: "walkDir" });
  assert.match(unfolded, /async function\* walkDir/);
  assert.match(unfolded, /yield 'entry'/);
} finally {
  await client.close().catch(() => {});
  await rm(projectRoot, { recursive: true, force: true });
}
