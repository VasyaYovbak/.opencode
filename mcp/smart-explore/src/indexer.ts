import { statSync } from "node:fs";
import { spawn } from "node:child_process";
import { collectSearchableFiles } from "./search.js";
import { parseFilesBatch } from "./parser.js";
import { chunkFromParsed } from "./chunker.js";
import { IndexStore } from "./index-store.js";
import { readProgress, writeProgress, isProcessAlive, type ProgressState } from "./progress.js";

export interface IndexResult {
  filesProcessed: number;
  filesTotal: number;
  chunksIndexed: number;
  deletedFiles: number;
  duration: number;
}

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
    startedAt: startTime,
    finishedAt: null,
    pid: process.pid,
    error: null,
  });

  try {
    const store = await IndexStore.open(projectRoot);

    const { files } = await collectSearchableFiles(projectRoot, { projectRoot });

    const indexedFiles = force
      ? new Map<string, number>()
      : await store.getIndexedFiles();

    const changedFiles: typeof files = [];
    for (const file of files) {
      const storedMtime = indexedFiles.get(file.relativePath);
      if (storedMtime === undefined) {
        changedFiles.push(file);
        continue;
      }
      const actualMtime = statSync(file.absolutePath).mtimeMs / 1000;
      if (actualMtime > storedMtime) {
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
      await store.deleteFile(path);
    }

    const totalFiles = changedFiles.length;
    let processed = 0;
    let totalChunks = 0;

    if (totalFiles === 0) {
      writeProgress(projectRoot, {
        status: "done",
        percent: 100,
        filesProcessed: 0,
        filesTotal: 0,
        chunksIndexed: 0,
        startedAt: startTime,
        finishedAt: Date.now(),
        pid: process.pid,
        error: null,
      });
      await store.close();
      return {
        filesProcessed: 0,
        filesTotal: 0,
        chunksIndexed: 0,
        deletedFiles: deletedPaths.length,
        duration: Date.now() - startTime,
      };
    }

    const parsed = parseFilesBatch(changedFiles, projectRoot);
    const filesByPath = new Map(changedFiles.map((file) => [file.relativePath, file]));
    const chunkFiles: Array<{ filePath: string; mtime: number; chunks: ReturnType<typeof chunkFromParsed> }> = [];

    for (const [relPath, parsedFile] of parsed) {
      const file = filesByPath.get(relPath);
      if (!file) continue;

      const chunks = chunkFromParsed(file.content, parsedFile);
      const mtime = statSync(file.absolutePath).mtimeMs / 1000;
      chunkFiles.push({ filePath: relPath, mtime, chunks });
    }

    await store.upsertChunkFiles(chunkFiles, {
      onBatch: (filesProcessed, chunksIndexed) => {
        totalChunks += chunksIndexed;
        processed += filesProcessed;
        writeProgress(projectRoot, {
          status: "indexing",
          percent: Math.round((processed / totalFiles) * 100),
          filesProcessed: processed,
          filesTotal: totalFiles,
          chunksIndexed: totalChunks,
          startedAt: startTime,
          finishedAt: null,
          pid: process.pid,
          error: null,
        });
      },
    });

    await store.close();

    writeProgress(projectRoot, {
      status: "done",
      percent: 100,
      filesProcessed: processed,
      filesTotal: totalFiles,
      chunksIndexed: totalChunks,
      startedAt: startTime,
      finishedAt: Date.now(),
      pid: process.pid,
      error: null,
    });

    return {
      filesProcessed: processed,
      filesTotal: totalFiles,
      chunksIndexed: totalChunks,
      deletedFiles: deletedPaths.length,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    writeProgress(projectRoot, {
      status: "error",
      percent: 0,
      filesProcessed: 0,
      filesTotal: 0,
      chunksIndexed: 0,
      startedAt: startTime,
      finishedAt: Date.now(),
      pid: process.pid,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function spawnIndexer(projectRoot: string): void {
  const child = spawn(process.execPath, [process.argv[1], "--index", projectRoot], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}
