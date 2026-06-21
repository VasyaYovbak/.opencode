/**
 * Search module — finds code files and symbols matching a query.
 *
 * Two search modes:
 * 1. Grep-style: find files/lines containing the query string
 * 2. Structural: parse files and match against symbol names/signatures
 *
 * Both return folded views, not raw content.
 *
 * Uses batch parsing (one CLI call per language) for fast multi-file search.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseFilesBatch, formatFoldedView, loadUserGrammars, type FoldedFile } from "./parser.js";

const CODE_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
  ".py", ".pyw",
  ".go",
  ".rs",
  ".rb",
  ".java",
  ".cs",
  ".cpp", ".cc", ".cxx", ".c", ".h", ".hpp", ".hh",
  ".swift",
  ".kt", ".kts",
  ".php",
  ".vue", ".svelte",
  ".ex", ".exs",
  ".lua",
  ".scala", ".sc",
  ".sh", ".bash", ".zsh",
  ".hs",
  ".zig",
  ".html", ".htm",
  ".css", ".scss",
  ".toml",
  ".yml", ".yaml",
  ".sql",
  ".md", ".mdx",
]);

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__",
  ".venv", "venv", "env", ".env", "target", "vendor",
  ".cache", ".turbo", "coverage", ".nyc_output",
  ".claude", ".smart-file-read",
]);

const MAX_FILE_SIZE = 512 * 1024; // 512KB — skip huge files

export interface SearchResult {
  foldedFiles: FoldedFile[];
  matchingSymbols: SymbolMatch[];
  totalFilesScanned: number;
  totalSymbolsFound: number;
  tokenEstimate: number;
}

export interface SearchableFile {
  absolutePath: string;
  relativePath: string;
  content: string;
}

export interface CollectSearchableFilesOptions {
  filePattern?: string;
  projectRoot?: string;
  excludePaths?: string[];
  maxDepth?: number;
  maxFiles?: number;
}

export interface SymbolMatch {
  filePath: string;
  symbolName: string;
  kind: string;
  signature: string;
  jsdoc?: string;
  lineStart: number;
  lineEnd: number;
  matchReason: string; // why this matched
  hashStart?: string;
  hashEnd?: string;
}

/**
 * Walk a directory recursively, yielding file paths.
 * extraExtensions: additional file extensions to include (from user grammar config).
 */
async function* walkDir(
  dir: string,
  rootDir: string,
  maxDepth: number = 20,
  extraExtensions?: Set<string>,
  excludedPaths: Set<string> = new Set()
 ): AsyncGenerator<string> {
  if (maxDepth <= 0) return;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // permission denied, etc.
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      const relDirPath = normalizeRelativePath(relative(rootDir, fullPath));
      if (isExcludedPath(relDirPath, excludedPaths)) continue;
      yield* walkDir(fullPath, rootDir, maxDepth - 1, extraExtensions, excludedPaths);
    } else if (entry.isFile()) {
      const ext = entry.name.slice(entry.name.lastIndexOf("."));
      if (CODE_EXTENSIONS.has(ext) || (extraExtensions && extraExtensions.has(ext))) {
        yield fullPath;
      }
    }
  }
}

function normalizeRelativePath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  return normalized === "." ? "" : normalized;
}

function isExcludedPath(relPath: string, excludedPaths: Set<string>): boolean {
  if (!relPath) return false;

  let current = normalizeRelativePath(relPath);
  while (current) {
    if (excludedPaths.has(current)) return true;

    const slashIndex = current.lastIndexOf("/");
    if (slashIndex === -1) return false;
    current = current.slice(0, slashIndex);
  }

  return false;
}

/**
 * Read a file safely, skipping if too large or binary.
 */
async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    const stats = await stat(filePath);
    if (stats.size > MAX_FILE_SIZE) return null;
    if (stats.size === 0) return null;

    const content = await readFile(filePath, "utf-8");

    // Quick binary check — if first 1000 chars have null bytes, skip
    if (content.slice(0, 1000).includes("\0")) return null;

    return content;
  } catch {
    return null;
  }
}

export async function collectSearchableFiles(
  rootDir: string,
  options: CollectSearchableFilesOptions = {}
 ): Promise<{ files: SearchableFile[]; truncated: boolean }> {
  const projectRoot = options.projectRoot || rootDir;
  const userConfig = loadUserGrammars(projectRoot);
  const extraExtensions = new Set<string>();
  for (const entry of Object.values(userConfig.grammars)) {
    for (const ext of entry.extensions) {
      if (!CODE_EXTENSIONS.has(ext)) {
        extraExtensions.add(ext);
      }
    }
  }

  const excludedPaths = new Set(
    (options.excludePaths || [])
      .map(normalizeRelativePath)
      .filter((path) => path.length > 0)
  );

  const files: SearchableFile[] = [];
  let truncated = false;

  for await (const filePath of walkDir(
    rootDir,
    rootDir,
    options.maxDepth || 20,
    extraExtensions.size > 0 ? extraExtensions : undefined,
    excludedPaths
  )) {
    const relativePath = normalizeRelativePath(relative(rootDir, filePath));
    if (options.filePattern) {
      if (!relativePath.toLowerCase().includes(options.filePattern.toLowerCase())) continue;
    }

    const content = await safeReadFile(filePath);
    if (!content) continue;

    files.push({
      absolutePath: filePath,
      relativePath,
      content,
    });

    if (options.maxFiles && files.length >= options.maxFiles) {
      truncated = true;
      break;
    }
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return { files, truncated };
}

/**
 * Search a codebase for symbols matching a query.
 *
 * Phase 1: Collect files and read content
 * Phase 2: Batch parse all files (one CLI call per language)
 * Phase 3: Match query against parsed symbols
 */
export async function searchCodebase(
  rootDir: string,
  query: string,
  options: {
    maxResults?: number;
    includeImports?: boolean;
    filePattern?: string;
    projectRoot?: string;
    excludePaths?: string[];
  } = {}
): Promise<SearchResult> {
  const maxResults = options.maxResults || 20;
  const queryLower = query.toLowerCase();
  const queryParts = queryLower.split(/[\s_\-./]+/).filter(p => p.length > 0);

  // Phase 1: Collect files and read content
  const projectRoot = options.projectRoot || rootDir;
  const { files: filesToParse } = await collectSearchableFiles(rootDir, {
    filePattern: options.filePattern,
    projectRoot,
    excludePaths: options.excludePaths,
  });

  // Phase 2: Batch parse (one CLI call per language)
  const parsedFiles = parseFilesBatch(filesToParse, projectRoot);

  // Phase 3: Match query against symbols
  const foldedFiles: FoldedFile[] = [];
  const matchingSymbols: SymbolMatch[] = [];
  let totalSymbolsFound = 0;

  for (const [relPath, parsed] of parsedFiles) {
    totalSymbolsFound += countSymbols(parsed);

    const pathMatch = matchScore(relPath.toLowerCase(), queryParts);
    let fileHasMatch = pathMatch > 0;
    const fileSymbolMatches: SymbolMatch[] = [];

    const checkSymbols = (symbols: typeof parsed.symbols, parent?: string) => {
      for (const sym of symbols) {
        let score = 0;
        let reason = "";

        const nameScore = matchScore(sym.name.toLowerCase(), queryParts);
        if (nameScore > 0) {
          score += nameScore * 3;
          reason = "name match";
        }

        if (sym.signature.toLowerCase().includes(queryLower)) {
          score += 2;
          reason = reason ? `${reason} + signature` : "signature match";
        }

        if (sym.jsdoc && sym.jsdoc.toLowerCase().includes(queryLower)) {
          score += 1;
          reason = reason ? `${reason} + jsdoc` : "jsdoc match";
        }

        if (score > 0) {
          fileHasMatch = true;
          fileSymbolMatches.push({
            filePath: relPath,
            symbolName: parent ? `${parent}.${sym.name}` : sym.name,
            kind: sym.kind,
            signature: sym.signature,
            jsdoc: sym.jsdoc,
            lineStart: sym.lineStart,
            lineEnd: sym.lineEnd,
            matchReason: reason,
            hashStart: sym.hashStart,
            hashEnd: sym.hashEnd,
          });
        }

        if (sym.children) {
          checkSymbols(sym.children, sym.name);
        }
      }
    };

    checkSymbols(parsed.symbols);

    if (fileHasMatch) {
      foldedFiles.push(parsed);
      matchingSymbols.push(...fileSymbolMatches);
    }
  }

  // Sort by relevance and trim
  matchingSymbols.sort((a, b) => {
    const aScore = matchScore(a.symbolName.toLowerCase(), queryParts);
    const bScore = matchScore(b.symbolName.toLowerCase(), queryParts);
    return bScore - aScore;
  });

  const trimmedSymbols = matchingSymbols.slice(0, maxResults);
  const relevantFiles = new Set(trimmedSymbols.map(s => s.filePath));
  const trimmedFiles = foldedFiles.filter(f => relevantFiles.has(f.filePath)).slice(0, maxResults);

  const tokenEstimate = trimmedFiles.reduce((sum, f) => sum + f.foldedTokenEstimate, 0);

  return {
    foldedFiles: trimmedFiles,
    matchingSymbols: trimmedSymbols,
    totalFilesScanned: filesToParse.length,
    totalSymbolsFound,
    tokenEstimate,
  };
}

/**
 * Score how well query parts match a string.
 * Returns 0 for no match, higher for better matches.
 */
function matchScore(text: string, queryParts: string[]): number {
  let score = 0;
  for (const part of queryParts) {
    if (text === part) {
      score += 10; // exact match
    } else if (text.includes(part)) {
      score += 5; // substring match
    } else {
      // Fuzzy: check if all chars appear in order
      let ti = 0;
      let matched = 0;
      for (const ch of part) {
        const idx = text.indexOf(ch, ti);
        if (idx !== -1) {
          matched++;
          ti = idx + 1;
        }
      }
      if (matched === part.length) {
        score += 1; // loose fuzzy match
      }
    }
  }
  return score;
}

function countSymbols(file: FoldedFile): number {
  let count = file.symbols.length;
  for (const sym of file.symbols) {
    if (sym.children) count += sym.children.length;
  }
  return count;
}

/**
 * Format search results for LLM consumption.
 */
export function formatSearchResults(result: SearchResult, query: string): string {
  const parts: string[] = [];

  parts.push(`🔍 Smart Search: "${query}"`);
  parts.push(`   Scanned ${result.totalFilesScanned} files, found ${result.totalSymbolsFound} symbols`);
  parts.push(`   ${result.matchingSymbols.length} matches across ${result.foldedFiles.length} files (~${result.tokenEstimate} tokens for folded view)`);
  parts.push("");

  if (result.matchingSymbols.length === 0) {
    parts.push("   No matching symbols found.");
    return parts.join("\n");
  }

  // Show matching symbols first (compact)
  parts.push("── Matching Symbols ──");
  parts.push("");
  for (const match of result.matchingSymbols) {
    const anchor = match.hashStart
      ? (match.hashEnd && match.hashEnd !== match.hashStart ? `${match.hashStart}-${match.hashEnd}` : match.hashStart)
      : "";
    if (anchor) {
      parts.push(`  ${match.kind} ${match.symbolName} (${match.filePath} ${anchor})`);
    } else {
      parts.push(`  ${match.kind} ${match.symbolName} (${match.filePath}:${match.lineStart + 1})`);
    }
    parts.push(`    ${match.signature}`);
    if (match.jsdoc) {
      const firstLine = match.jsdoc.split("\n").find(l => l.replace(/^[\s*/]+/, "").trim().length > 0);
      if (firstLine) {
        parts.push(`    💬 ${firstLine.replace(/^[\s*/]+/, "").trim()}`);
      }
    }
    parts.push("");
  }

  // Show folded file views
  parts.push("── Folded File Views ──");
  parts.push("");
  for (const file of result.foldedFiles) {
    parts.push(formatFoldedView(file));
    parts.push("");
  }

  parts.push("── Actions ──");
  parts.push('  To see full implementation: use smart_unfold with file path and symbol name');

  return parts.join("\n");
}
