import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { walkDir, normalizeRelativePath } from "./search.js";
import { parseFilesBatch, formatFoldedView, loadUserGrammars, type FoldedFile } from "./parser.js";

interface CacheEntry {
  cacheRoot: string;
  mtime: number;
  size: number;
  foldedFile: FoldedFile;
}

interface DiskCacheEntry {
  mtime: number;
  size: number;
  foldedFile: FoldedFile;
}

interface DiskCache {
  version: 1;
  entries: Record<string, DiskCacheEntry>;
}

const outlineCache = new Map<string, CacheEntry>();
const loadedCacheRoots = new Set<string>();
const MAX_CACHE_SIZE = 5000;
const CACHE_DIR = ".smart-explore-mcp-cache";
const CACHE_FILE = "outline-cache.json";

interface DirectoryOutlineResult {
  outlines: string[];
  truncated: boolean;
  skipped: number;
  cached: number;
  parsed: number;
}

export interface FileOutlineResult {
  content: string;
  foldedFile: FoldedFile;
  cached: boolean;
}

interface PendingFile {
  absolutePath: string;
  relativePath: string;
  content: string;
  mtime: number;
  size: number;
}

export async function getDirectoryOutline(
  dirPath: string,
  maxFiles: number
): Promise<DirectoryOutlineResult> {
  return buildDirectoryOutline(resolve(dirPath), maxFiles, true);
}

export async function warmDirectoryOutlineCache(
  projectRoot: string,
  maxFiles: number = MAX_CACHE_SIZE
): Promise<Omit<DirectoryOutlineResult, "outlines">> {
  const result = await buildDirectoryOutline(resolve(projectRoot), maxFiles, false);
  return {
    truncated: result.truncated,
    skipped: result.skipped,
    cached: result.cached,
    parsed: result.parsed,
  };
}

export async function getFileOutline(filePath: string): Promise<FileOutlineResult> {
  const absolutePath = resolve(filePath);
  const cacheRoot = await findCacheRoot(absolutePath);
  await loadDiskCache(cacheRoot);

  const stats = await stat(absolutePath);
  const content = await readFile(absolutePath, "utf-8");
  const cacheEntry = outlineCache.get(absolutePath);
  if (cacheEntry && cacheEntry.mtime === stats.mtimeMs && cacheEntry.size === stats.size) {
    return { content, foldedFile: cacheEntry.foldedFile, cached: true };
  }

  const relPath = normalizeRelativePath(relative(cacheRoot, absolutePath));
  const parsedResults = parseFilesBatch([{ absolutePath, relativePath: relPath, content }], cacheRoot);
  const foldedFile = parsedResults.get(relPath) ?? {
    filePath: relPath,
    language: "text",
    symbols: [],
    imports: [],
    totalLines: content.split("\n").length,
    foldedTokenEstimate: 0,
  };

  evictIfNeeded();
  outlineCache.set(absolutePath, {
    cacheRoot,
    mtime: stats.mtimeMs,
    size: stats.size,
    foldedFile,
  });
  await saveDiskCache(cacheRoot);

  return { content, foldedFile, cached: false };
}

async function buildDirectoryOutline(
  dirPath: string,
  maxFiles: number,
  includeOutlines: boolean
): Promise<DirectoryOutlineResult> {
  const cacheRoot = await findCacheRoot(dirPath);
  await loadDiskCache(cacheRoot);

  const userConfig = loadUserGrammars(cacheRoot);
  const extraExtensions = new Set<string>();
  for (const entry of Object.values(userConfig.grammars)) {
    for (const ext of entry.extensions) {
      extraExtensions.add(ext);
    }
  }

  const filePaths: string[] = [];
  let truncated = false;

  for await (const filePath of walkDir(
    dirPath,
    cacheRoot,
    20,
    extraExtensions.size > 0 ? extraExtensions : undefined
  )) {
    filePaths.push(filePath);
    if (filePaths.length >= maxFiles) {
      truncated = true;
      break;
    }
  }

  filePaths.sort((a, b) => relative(dirPath, a).localeCompare(relative(dirPath, b)));

  const foldedFiles: Array<{ absolutePath: string; foldedFile: FoldedFile }> = [];
  let skipped = 0;
  let cached = 0;
  let parsed = 0;
  const toParse: PendingFile[] = [];

  for (const absPath of filePaths) {
    let stats;
    try {
      stats = await stat(absPath);
    } catch {
      skipped++;
      continue;
    }

    const relPath = normalizeRelativePath(relative(cacheRoot, absPath));
    const cacheEntry = outlineCache.get(absPath);

    if (cacheEntry && cacheEntry.mtime === stats.mtimeMs && cacheEntry.size === stats.size) {
      if (cacheEntry.foldedFile.symbols.length > 0) {
        foldedFiles.push({ absolutePath: absPath, foldedFile: cacheEntry.foldedFile });
      } else {
        skipped++;
      }
      cached++;
      continue;
    }

    try {
      const content = await readFile(absPath, "utf-8");
      toParse.push({
        absolutePath: absPath,
        relativePath: relPath,
        content,
        mtime: stats.mtimeMs,
        size: stats.size,
      });
    } catch {
      skipped++;
    }
  }

  if (toParse.length > 0) {
    const parsedResults = parseFilesBatch(
      toParse.map((f) => ({
        absolutePath: f.absolutePath,
        relativePath: f.relativePath,
        content: f.content,
      })),
      cacheRoot
    );

    for (const file of toParse) {
      const foldedFile = parsedResults.get(file.relativePath);
      if (!foldedFile || foldedFile.symbols.length === 0) {
        skipped++;
        continue;
      }

      evictIfNeeded();
      outlineCache.set(file.absolutePath, {
        cacheRoot,
        mtime: file.mtime,
        size: file.size,
        foldedFile,
      });

      foldedFiles.push({ absolutePath: file.absolutePath, foldedFile });
      parsed++;
    }

    await saveDiskCache(cacheRoot);
  }

  foldedFiles.sort((a, b) => a.foldedFile.filePath.localeCompare(b.foldedFile.filePath));

  const outlines = includeOutlines
    ? foldedFiles.map(({ absolutePath, foldedFile }) =>
        formatFoldedView(rebaseFoldedFile(foldedFile, dirPath, absolutePath))
      )
    : [];

  return { outlines, truncated, skipped, cached, parsed };
}

async function findCacheRoot(startPath: string): Promise<string> {
  let current = startPath;
  try {
    const stats = await stat(current);
    if (!stats.isDirectory()) current = dirname(current);
  } catch {
    current = dirname(current);
  }

  while (true) {
    try {
      await stat(join(current, ".git"));
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) return startPath;
      current = parent;
    }
  }
}

async function loadDiskCache(cacheRoot: string): Promise<void> {
  if (loadedCacheRoots.has(cacheRoot)) return;
  loadedCacheRoots.add(cacheRoot);

  try {
    const raw = await readFile(cachePath(cacheRoot), "utf-8");
    const data = JSON.parse(raw) as DiskCache;
    if (data.version !== 1 || !data.entries) return;

    for (const [relPath, entry] of Object.entries(data.entries)) {
      const absolutePath = join(cacheRoot, relPath);
      outlineCache.set(absolutePath, {
        cacheRoot,
        mtime: entry.mtime,
        size: entry.size,
        foldedFile: entry.foldedFile,
      });
    }
  } catch {
    // Missing or corrupt cache: rebuild lazily.
  }
}

async function saveDiskCache(cacheRoot: string): Promise<void> {
  const entries: Record<string, DiskCacheEntry> = {};
  for (const [absolutePath, entry] of outlineCache) {
    if (entry.cacheRoot !== cacheRoot) continue;
    const relPath = normalizeRelativePath(relative(cacheRoot, absolutePath));
    entries[relPath] = {
      mtime: entry.mtime,
      size: entry.size,
      foldedFile: entry.foldedFile,
    };
  }

  const dir = join(cacheRoot, CACHE_DIR);
  await mkdir(dir, { recursive: true });
  const target = join(dir, CACHE_FILE);
  const temp = `${target}.tmp`;
  await writeFile(temp, JSON.stringify({ version: 1, entries } satisfies DiskCache));
  await rename(temp, target);
}

function cachePath(cacheRoot: string): string {
  return join(cacheRoot, CACHE_DIR, CACHE_FILE);
}

function rebaseFoldedFile(foldedFile: FoldedFile, displayRoot: string, absolutePath: string): FoldedFile {
  return {
    ...foldedFile,
    filePath: normalizeRelativePath(relative(displayRoot, absolutePath)),
  };
}

function evictIfNeeded(): void {
  if (outlineCache.size < MAX_CACHE_SIZE) return;
  const firstKey = outlineCache.keys().next().value;
  if (firstKey) outlineCache.delete(firstKey);
}
