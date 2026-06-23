import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface ProgressState {
  status: "idle" | "indexing" | "done" | "error";
  percent: number;
  filesProcessed: number;
  filesTotal: number;
  chunksIndexed: number;
  chunksTotal: number;
  startedAt: number;
  finishedAt: number | null;
  pid: number;
  error: string | null;
}

const PROGRESS_FILE = "progress.json";
const CACHE_DIR_NAME = ".smart-explore-mcp-cache";

function progressPath(projectRoot: string): string {
  return join(projectRoot, CACHE_DIR_NAME, PROGRESS_FILE);
}

export function readProgress(projectRoot: string): ProgressState | null {
  const p = progressPath(projectRoot);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as ProgressState;
  } catch {
    return null;
  }
}

export function writeProgress(projectRoot: string, state: ProgressState): void {
  const p = progressPath(projectRoot);
  try {
    const dir = join(projectRoot, CACHE_DIR_NAME);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(p, JSON.stringify(state, null, 2));
  } catch {}
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function getProgressStatus(projectRoot: string): ProgressState | null {
  const state = readProgress(projectRoot);
  if (!state) return null;
  if (!Number.isFinite(state.chunksTotal)) state.chunksTotal = state.chunksIndexed;

  if (state.status === "indexing" && !isProcessAlive(state.pid)) {
    state.status = "error";
    state.error = "Indexing process died unexpectedly";
    state.finishedAt = Date.now();
    writeProgress(projectRoot, state);
  }

  return state;
}
