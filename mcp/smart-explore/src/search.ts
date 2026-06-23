import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { loadUserGrammars } from "./parser.js";
import type { SearchRow } from "./index-store.js";

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
  ".claude", ".smart-file-read", ".smart-explore-mcp-cache",
]);
const IGNORE_FILES = new Set([
  "pnpm-lock.yaml", "package-lock.json", "yarn.lock",
  "Cargo.lock", "poetry.lock", "composer.lock",
  "Gemfile.lock", "go.sum", "flake.lock",
  "gradle.lockfile", "maven.lock",
]);

const MAX_FILE_SIZE = 512 * 1024;

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

export async function* walkDir(
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
    return;
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (IGNORE_FILES.has(entry.name)) continue;

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

export function normalizeRelativePath(path: string) {
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

async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    const stats = await stat(filePath);
    if (stats.size > MAX_FILE_SIZE) return null;
    if (stats.size === 0) return null;

    const content = await readFile(filePath, "utf-8");

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

const SYMBOL_ICONS: Record<string, string> = {
  function: "ƒ", method: "ƒ", class: "◆", interface: "◇",
  type: "◇", const: "●", variable: "○", export: "→",
  struct: "◆", enum: "▣", trait: "◇", impl: "◈",
  property: "○", getter: "⇢", setter: "⇠", mixin: "◈",
  section: "§", code: "⌘", text: "¶", metadata: "◊", reference: "↗",
};

export function formatSearchResults(
  query: string,
  rows: SearchRow[],
  hasEmbedding: boolean,
): string {
  const parts: string[] = [];
  const mode = hasEmbedding ? "hybrid (vector + BM25)" : "BM25";

  parts.push(`🔍 Smart Search: "${query}"`);
  parts.push(`   ${rows.length} matches (${mode} search)`);
  parts.push("");

  if (rows.length === 0) {
    parts.push("   No matches found.");
    parts.push("");
    parts.push("   Try smart_index to rebuild the index, or smart_outline to browse files.");
    return parts.join("\n");
  }

  parts.push("── Results by File ──");
  parts.push("");

  // Group rows by file
  const byFile = new Map<string, SearchRow[]>();
  for (const row of rows) {
    const list = byFile.get(row.file_path) ?? [];
    list.push(row);
    byFile.set(row.file_path, list);
  }

  // Sort files by match count (most matches first), then alphabetically
  const sortedFiles = [...byFile.entries()].sort((a, b) => {
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return a[0].localeCompare(b[0]);
  });

  // Within each file, sort by line number (file order, not relevance)
  for (const [, fileRows] of sortedFiles) {
    fileRows.sort((a, b) => a.line_start - b.line_start);
  }

  for (const [filePath, fileRows] of sortedFiles) {
    const lang = fileRows[0].language || "text";
    parts.push(`📁 ${filePath} (${lang}, ${fileRows.length} match${fileRows.length > 1 ? "es" : ""})`);

    for (const row of fileRows) {
      const icon = SYMBOL_ICONS[row.kind] || "·";
      const range = row.line_start === row.line_end
        ? `L${row.line_start + 1}`
        : `L${row.line_start + 1}-L${row.line_end + 1}`;
      const anchor = row.hash_start || range;
      const name = row.symbol_name || "(text chunk)";

      parts.push(`  ${icon} ${name} ${anchor}`);
      const contentLines = row.content.split("\n").slice(0, 8);
      for (const line of contentLines) {
        const trimmed = line.replace(/\s+$/, "");
        if (trimmed.length > 0) parts.push(`    ${trimmed.slice(0, 120)}`);
      }
      if (row.content.split("\n").length > 8) {
        parts.push("    ...");
      }
    }
    parts.push("");
  }

  parts.push("── Actions ──");
  parts.push('  To see full code: use smart_unfold with file_path and symbol_name');
  parts.push('  To see file structure: use smart_outline with file_path');
  parts.push('  To reindex: use smart_index');

  return parts.join("\n");
}
