import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { collectSearchableFiles } from "./search.js";
import { parseFilesBatch } from "./parser.js";
import { chunkFromParsed } from "./chunker.js";
import { IndexStore } from "./index-store.js";
import { setEmbeddingProgressHandler } from "./embed.js";
import { readProgress, writeProgress, isProcessAlive, type ProgressState } from "./progress.js";

export interface IndexResult {
  filesProcessed: number;
  filesTotal: number;
  chunksIndexed: number;
  deletedFiles: number;
  duration: number;
}

const PROGRESS_WRITE_INTERVAL_MS = 250;

export async function indexProject(
  projectRoot: string,
  options?: { force?: boolean },
): Promise<IndexResult> {
  const startTime = Date.now();
  const force = options?.force ?? false;

  const existing = readProgress(projectRoot);
  if (
    existing?.status === "indexing" &&
    existing.pid !== process.pid &&
    isProcessAlive(existing.pid)
  ) {
    throw new Error(`Another indexing process is running (pid=${existing.pid})`);
  }

  writeProgress(projectRoot, {
    status: "indexing",
    percent: 0,
    filesProcessed: 0,
    filesTotal: 0,
    chunksIndexed: 0,
    chunksTotal: 0,
    startedAt: startTime,
    finishedAt: null,
    pid: process.pid,
    error: null,
  });

  let totalFiles = 0;
  let processed = 0;
  let indexedChunks = 0;
  let chunksTotal = 0;
  let store: IndexStore | undefined;

  try {
    const activeStore = await IndexStore.open(projectRoot);
    store = activeStore;

    const { files } = await collectSearchableFiles(projectRoot, { projectRoot });

    const indexedFiles = force
      ? new Map<string, number>()
      : await activeStore.getIndexedFiles();

    const changedFiles: typeof files = [];
    for (const file of files) {
      const storedMtime = indexedFiles.get(file.relativePath);
      if (storedMtime === undefined) {
        changedFiles.push(file);
        continue;
      }
      if (file.mtime !== storedMtime) {
        changedFiles.push(file);
      }
    }

    const currentPaths = new Set(files.map((f) => f.relativePath));
    const deletedPaths: string[] = [];
    for (const path of indexedFiles.keys()) {
      if (!currentPaths.has(path)) {
        deletedPaths.push(path);
      }
    }

    for (const path of deletedPaths) {
      await activeStore.deleteFile(path);
    }

    const readableChangedFiles: Array<(typeof changedFiles)[number] & { content: string }> = [];
    for (const file of changedFiles) {
      try {
        const content = await readFile(file.absolutePath, "utf-8");
        readableChangedFiles.push({ ...file, content: content.slice(0, 1000).includes("\0") ? "" : content });
      } catch {
        // The next incremental run will reconcile files changed during this scan.
      }
    }

    totalFiles = readableChangedFiles.length;
    processed = 0;
    indexedChunks = 0;
    chunksTotal = 0;
    let lastProgressWrite = 0;

    const writeIndexProgress = (status: ProgressState["status"], forceWrite = false) => {
      const now = Date.now();
      if (!forceWrite && now - lastProgressWrite < PROGRESS_WRITE_INTERVAL_MS) return;
      lastProgressWrite = now;

      const chunkRatio = chunksTotal > 0 ? indexedChunks / chunksTotal : 0;
      const percent = status === "done"
        ? 100
        : chunksTotal > 0
          ? Number((chunkRatio * 100).toFixed(1))
          : totalFiles > 0
            ? Number(((processed / totalFiles) * 100).toFixed(1))
            : 0;
      const filesProcessed = status === "done"
        ? processed
        : chunksTotal > 0
          ? Number((chunkRatio * totalFiles).toFixed(2))
          : processed;

      writeProgress(projectRoot, {
        status,
        percent,
        filesProcessed,
        filesTotal: totalFiles,
        chunksIndexed: indexedChunks,
        chunksTotal,
        startedAt: startTime,
        finishedAt: status === "indexing" ? null : now,
        pid: process.pid,
        error: null,
      });
    };

    if (totalFiles === 0) {
      writeIndexProgress("done", true);
      return {
        filesProcessed: 0,
        filesTotal: 0,
        chunksIndexed: 0,
        deletedFiles: deletedPaths.length,
        duration: Date.now() - startTime,
      };
    }

    const parsed = parseFilesBatch(readableChangedFiles, projectRoot);
    const filesByPath = new Map(readableChangedFiles.map((file) => [file.relativePath, file]));
    const chunkFiles: Array<{ filePath: string; mtime: number; chunks: ReturnType<typeof chunkFromParsed> }> = [];

    for (const [relPath, parsedFile] of parsed) {
      const file = filesByPath.get(relPath);
      if (!file) continue;

      const chunks = chunkFromParsed(file.content, parsedFile);
      chunkFiles.push({ filePath: relPath, mtime: file.mtime, chunks });
    }

    chunksTotal = chunkFiles.reduce((sum, file) => sum + file.chunks.length, 0);
    writeIndexProgress("indexing", true);

    try {
      if (activeStore.hasEmbedding && chunksTotal > 0) {
        setEmbeddingProgressHandler((chunkCount) => {
          indexedChunks = Math.min(chunksTotal, indexedChunks + chunkCount);
          writeIndexProgress("indexing");
        });
      }

      await activeStore.upsertChunkFiles(chunkFiles, {
        onBatch: (filesProcessed, chunksIndexed) => {
          processed += filesProcessed;
          if (!activeStore.hasEmbedding) {
            indexedChunks = Math.min(chunksTotal, indexedChunks + chunksIndexed);
          }
          writeIndexProgress("indexing", true);
        },
      });
    } finally {
      setEmbeddingProgressHandler(null);
    }

    processed = totalFiles;
    indexedChunks = chunksTotal;
    writeIndexProgress("done", true);

    return {
      filesProcessed: processed,
      filesTotal: totalFiles,
      chunksIndexed: chunksTotal,
      deletedFiles: deletedPaths.length,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const percent = chunksTotal > 0 ? Number(((indexedChunks / chunksTotal) * 100).toFixed(1)) : 0;
    const filesProcessed = chunksTotal > 0 ? Number((((indexedChunks / chunksTotal) * totalFiles)).toFixed(2)) : processed;
    writeProgress(projectRoot, {
      status: "error",
      percent,
      filesProcessed,
      filesTotal: totalFiles,
      chunksIndexed: indexedChunks,
      chunksTotal,
      startedAt: startTime,
      finishedAt: Date.now(),
      pid: process.pid,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await store?.close();
  }
}

export function spawnIndexer(projectRoot: string): void {
  const child = spawn(process.execPath, [process.argv[1], "--index", projectRoot], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}
