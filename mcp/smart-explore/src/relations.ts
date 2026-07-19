import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { existsSync } from "node:fs";
import { parseFilesBatch, type CodeSymbol, type FoldedFile } from "./parser.js";

const CODE_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
  ".py", ".pyw", ".go", ".rs", ".rb", ".java",
  ".cpp", ".cc", ".cxx", ".c", ".h", ".hpp", ".hh",
  ".swift", ".kt", ".kts", ".php", ".ex", ".exs", ".lua",
  ".scala", ".sc", ".sh", ".bash", ".zsh", ".hs", ".zig",
  ".html", ".htm", ".css", ".scss", ".toml", ".yml", ".yaml",
  ".sql", ".md", ".mdx",
]);

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__",
  ".venv", "venv", "env", ".env", "target", "vendor", ".cache",
  ".turbo", "coverage", ".nyc_output", ".claude", ".smart-file-read",
]);

const MAX_FILE_SIZE = 512 * 1024;
const CALL_IGNORE = new Set([
  "if", "for", "while", "switch", "catch", "return", "typeof", "sizeof", "new",
  "function", "class", "import", "export", "await", "yield", "throw", "else",
  "map", "filter", "reduce", "forEach", "find", "some", "every", "includes", "slice",
  "split", "join", "push", "pop", "shift", "unshift", "toLowerCase", "toUpperCase",
  "trim", "trimStart", "trimEnd", "replace", "match", "test", "sort", "set", "get",
  "has", "values", "keys", "entries", "resolve", "reject",
]);

export interface CallEdge {
  caller: string;
  callerFile: string;
  callerLine: number;
  callee: string;
  calleeFile?: string;
  calleeLine?: number;
  callText: string;
  line: number;
}

interface ParsedProject {
  rootDir: string;
  files: Array<{ absolutePath: string; relativePath: string; content: string }>;
  parsed: Map<string, FoldedFile>;
  symbols: ProjectSymbol[];
  calls: CallEdge[];
}

interface ProjectSymbol {
  name: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  signature: string;
}

interface SymbolIndex {
  byName: Map<string, ProjectSymbol[]>;
  byShortName: Map<string, ProjectSymbol[]>;
}

const relationCache = new Map<string, { fingerprint: string; project: ParsedProject }>();

async function* walkDir(dir: string, maxDepth = 20): AsyncGenerator<string> {
  if (maxDepth <= 0) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath, maxDepth - 1);
    } else if (entry.isFile() && CODE_EXTENSIONS.has(extname(entry.name))) {
      yield fullPath;
    }
  }
}

async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    const stats = await stat(filePath);
    if (stats.size === 0 || stats.size > MAX_FILE_SIZE) return null;
    const content = await readFile(filePath, "utf-8");
    if (content.slice(0, 1000).includes("\0")) return null;
    return content;
  } catch {
    return null;
  }
}

async function collectProject(rootDir: string, filePattern?: string, pathPrefix?: string): Promise<ParsedProject> {
  const normalizedPrefix = pathPrefix ? pathPrefix.replace(/^\.\//, '').replace(/\/$/, '') : null;
  const candidates: Array<{ absolutePath: string; relativePath: string; mtimeMs: number; size: number }> = [];
  for await (const absolutePath of walkDir(rootDir)) {
    const relativePath = relative(rootDir, absolutePath);
    if (normalizedPrefix && !relativePath.startsWith(normalizedPrefix)) continue;
    if (filePattern && !relativePath.toLowerCase().includes(filePattern.toLowerCase())) continue;
    try {
      const metadata = await stat(absolutePath);
      if (metadata.size === 0 || metadata.size > MAX_FILE_SIZE) continue;
      candidates.push({ absolutePath, relativePath, mtimeMs: metadata.mtimeMs, size: metadata.size });
    } catch {}
  }

  candidates.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const cacheKey = JSON.stringify([resolve(rootDir), filePattern?.toLowerCase() ?? "", normalizedPrefix ?? ""]);
  const fingerprint = candidates.map(file => `${file.relativePath}:${file.mtimeMs}:${file.size}`).join("\n");
  const cached = relationCache.get(cacheKey);
  if (cached?.fingerprint === fingerprint) return cached.project;

  const files: ParsedProject["files"] = [];
  for (const candidate of candidates) {
    const { absolutePath, relativePath } = candidate;
    const content = await safeReadFile(absolutePath);
    if (!content) continue;
    files.push({ absolutePath, relativePath, content });
  }

  const parsed = parseFilesBatch(files, rootDir);
  const symbols = flattenProjectSymbols(parsed);
  const symbolIndex: SymbolIndex = { byName: new Map(), byShortName: new Map() };
  for (const symbol of symbols) {
    const shortName = symbol.name.split(".").pop()!;
    symbolIndex.byName.set(symbol.name, [...(symbolIndex.byName.get(symbol.name) ?? []), symbol]);
    symbolIndex.byShortName.set(shortName, [...(symbolIndex.byShortName.get(shortName) ?? []), symbol]);
  }

  const calls: CallEdge[] = [];
  for (const file of files) {
    const folded = parsed.get(file.relativePath);
    if (!folded) continue;
    calls.push(...extractCalls(rootDir, file.relativePath, file.content, folded.symbols, symbolIndex));
  }

  const project = { rootDir, files, parsed, symbols, calls };
  relationCache.set(cacheKey, { fingerprint, project });
  if (relationCache.size > 20) relationCache.delete(relationCache.keys().next().value!);
  return project;
}

function flattenProjectSymbols(parsed: Map<string, FoldedFile>): ParsedProject["symbols"] {
  const result: ParsedProject["symbols"] = [];
  for (const file of parsed.values()) {
    const visit = (symbols: CodeSymbol[], parent?: string) => {
      for (const sym of symbols) {
        const qualified = parent ? `${parent}.${sym.name}` : sym.name;
        result.push({
          name: qualified,
          filePath: file.filePath,
          lineStart: sym.lineStart,
          lineEnd: sym.lineEnd,
          signature: sym.signature,
        });
        if (sym.children) visit(sym.children, qualified);
      }
    };
    visit(file.symbols);
  }
  return result;
}

function extractCalls(
  rootDir: string,
  filePath: string,
  content: string,
  symbols: CodeSymbol[],
  symbolIndex: SymbolIndex,
): CallEdge[] {
  const flatSymbols: ParsedProject["symbols"] = [];
  const visit = (items: CodeSymbol[], parent?: string) => {
    for (const item of items) {
      const name = parent ? `${parent}.${item.name}` : item.name;
      flatSymbols.push({ name, filePath, lineStart: item.lineStart, lineEnd: item.lineEnd, signature: item.signature });
      if (item.children) visit(item.children, name);
    }
  };
  visit(symbols);

  const lines = content.split("\n");
  const edges: CallEdge[] = [];
  const importTargets = extractImportTargets(rootDir, filePath, content);
  const callRegex = /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*\(/g;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = stripLineComment(lines[lineIndex]);
    let match: RegExpExecArray | null;
    while ((match = callRegex.exec(line))) {
      const callText = match[1];
      const callee = callText.split(".").pop() || callText;
      if (CALL_IGNORE.has(callee) || CALL_IGNORE.has(callText)) continue;
      if (looksLikeDefinition(line, match.index)) continue;

      const caller = findEnclosingSymbol(flatSymbols, lineIndex);
      if (!caller) continue;
      if (caller.name === callee || caller.name.endsWith(`.${callee}`)) continue;

      const receiver = callText.includes(".") ? callText.slice(0, callText.indexOf(".")) : null;
      const imported = importTargets.get(receiver ?? callee);
      const resolvedName = receiver ? callee : imported?.importedName ?? callee;
      const exactCandidates = symbolIndex.byName.get(callText) ?? [];
      const shortCandidates = symbolIndex.byShortName.get(resolvedName) ?? [];
      const target = exactCandidates.find(symbol => symbol.filePath === filePath)
        ?? (exactCandidates.length === 1 ? exactCandidates[0] : undefined)
        ?? (imported
          ? shortCandidates.find(symbol => symbol.filePath === imported.filePath)
          : undefined)
        ?? shortCandidates.find(symbol => symbol.filePath === filePath)
        ?? (shortCandidates.length === 1 ? shortCandidates[0] : undefined);
      edges.push({
        caller: caller.name,
        callerFile: filePath,
        callerLine: caller.lineStart + 1,
        callee: target?.name.split(".").pop() ?? resolvedName,
        calleeFile: target?.filePath,
        calleeLine: target ? target.lineStart + 1 : undefined,
        callText,
        line: lineIndex + 1,
      });
    }
  }

  return edges;
}

function extractImportTargets(rootDir: string, sourceFile: string, content: string): Map<string, { filePath: string; importedName?: string }> {
  const targets = new Map<string, { filePath: string; importedName?: string }>();
  const pattern = /\bimport\s+([^;\n]+?)\s+from\s+["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) {
    const targetFile = resolveImport(rootDir, sourceFile, match[2]);
    if (!targetFile) continue;
    const clause = match[1].trim();
    const namespace = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    if (namespace) targets.set(namespace[1], { filePath: targetFile });
    const named = clause.match(/\{([^}]+)\}/);
    if (!named) continue;
    for (const specifier of named[1].split(",")) {
      const [importedName, localName = importedName] = specifier.trim().split(/\s+as\s+/);
      if (importedName) targets.set(localName, { filePath: targetFile, importedName });
    }
  }
  return targets;
}

function stripLineComment(line: string): string {
  return line.replace(/\/\/.*$/, "").replace(/#.*$/, "");
}

function looksLikeDefinition(line: string, callIndex: number): boolean {
  const before = line.slice(0, callIndex);
  return /\b(function|def|func|fn)\s+$/.test(before) || /=>\s*$/.test(line);
}

function findEnclosingSymbol(symbols: ParsedProject["symbols"], lineIndex: number): ParsedProject["symbols"][number] | null {
  let best: ParsedProject["symbols"][number] | null = null;
  for (const sym of symbols) {
    if (lineIndex >= sym.lineStart && lineIndex <= sym.lineEnd) {
      if (!best || (sym.lineEnd - sym.lineStart) < (best.lineEnd - best.lineStart)) best = sym;
    }
  }
  return best;
}

export async function findCallers(rootDir: string, symbolName: string, options: { maxResults?: number; filePattern?: string; pathPrefix?: string } = {}): Promise<string> {
  const project = await collectProject(rootDir, options.filePattern, options.pathPrefix);
  const matches = project.calls.filter(edge => edge.callee === symbolName || edge.callText === symbolName || edge.callText.endsWith(`.${symbolName}`));
  return formatCallEdges("Incoming Call Edges", symbolName, matches.slice(0, options.maxResults || 40), project.calls.length);
}

export async function findCallees(rootDir: string, symbolName: string, options: { maxResults?: number; filePattern?: string; pathPrefix?: string } = {}): Promise<string> {
  const project = await collectProject(rootDir, options.filePattern, options.pathPrefix);
  const matches = project.calls.filter(edge => edge.caller === symbolName || edge.caller.endsWith(`.${symbolName}`));
  matches.sort((a, b) => Number(Boolean(b.calleeFile)) - Number(Boolean(a.calleeFile)));
  return formatCallEdges("Outgoing Call Edges", symbolName, matches.slice(0, options.maxResults || 40), project.calls.length);
}

function formatCallEdges(title: string, symbolName: string, edges: CallEdge[], totalEdges: number): string {
  const parts = [`${title}: ${symbolName}`, `Scanned ${totalEdges} candidate call edges`, ""];
  if (edges.length === 0) {
    parts.push("No matching call edges found.");
    return parts.join("\n");
  }

  for (const edge of edges) {
    const target = edge.calleeFile ? `${edge.calleeFile}:${edge.calleeLine}` : "unresolved";
    parts.push(`- ${edge.caller} (${edge.callerFile}:${edge.line}) -> ${edge.callText} [target: ${target}]`);
  }
  return parts.join("\n");
}

export async function relatedFiles(rootDir: string, filePath: string, options: { maxResults?: number; pathPrefix?: string } = {}): Promise<string> {
  const absoluteTarget = resolve(rootDir, filePath);
  const targetRel = relative(rootDir, absoluteTarget);
  const project = await collectProject(rootDir);
  const importsByFile = new Map<string, string[]>();

  const normalizedPrefix = options.pathPrefix ? options.pathPrefix.replace(/^\.\//, '').replace(/\/$/, '') : null;
  const matchesPrefix = (p: string) => !normalizedPrefix || p.startsWith(normalizedPrefix);

  for (const file of project.files) {
    importsByFile.set(file.relativePath, extractImportSpecifiers(file.content));
  }

  const outgoing = (importsByFile.get(targetRel) || [])
    .map(spec => resolveImport(rootDir, targetRel, spec))
    .filter((item): item is string => Boolean(item))
    .filter(matchesPrefix);

  const incoming: string[] = [];
  for (const [sourceFile, specs] of importsByFile) {
    if (sourceFile === targetRel) continue;
    if (!matchesPrefix(sourceFile)) continue;
    if (specs.some(spec => resolveImport(rootDir, sourceFile, spec) === targetRel)) incoming.push(sourceFile);
  }

  const tests = findLikelyTests(project.files.map(f => f.relativePath), targetRel).filter(matchesPrefix);
  return formatRelatedFiles(targetRel, outgoing, incoming, tests, options.maxResults || 40);
}

function extractImportSpecifiers(content: string): string[] {
  const specs = new Set<string>();
  const patterns = [
    /\bimport\s+(?:[^'";]+\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+[^'";]+\s+from\s+["']([^"']+)["']/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content))) specs.add(match[1]);
  }
  return [...specs];
}

function resolveImport(rootDir: string, sourceRel: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = resolve(rootDir, dirname(sourceRel), spec);
  const candidates = [
    base,
    ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].map(ext => base + ext),
    ...sourceEquivalentCandidates(base),
    ...["index.ts", "index.tsx", "index.js", "index.jsx"].map(name => join(base, name)),
  ];
  const found = candidates.find(candidate => existsSync(candidate));
  return found ? relative(rootDir, found) : null;
}

function sourceEquivalentCandidates(base: string): string[] {
  if (base.endsWith(".js")) return [base.slice(0, -3) + ".ts", base.slice(0, -3) + ".tsx"];
  if (base.endsWith(".jsx")) return [base.slice(0, -4) + ".tsx"];
  if (base.endsWith(".mjs") || base.endsWith(".cjs")) return [base.slice(0, -4) + ".ts"];
  return [];
}

function findLikelyTests(allFiles: string[], targetRel: string): string[] {
  const base = targetRel.replace(/\.[^.]+$/, "").split("/").pop() || targetRel;
  return allFiles.filter(file => {
    const lower = file.toLowerCase();
    return lower.includes(base.toLowerCase()) && /(?:test|spec|__tests__)/.test(lower) && file !== targetRel;
  });
}

function formatRelatedFiles(targetRel: string, outgoing: string[], incoming: string[], tests: string[], maxResults: number): string {
  const parts = [`Related Files: ${targetRel}`, ""];
  parts.push("Outgoing imports:");
  parts.push(...formatFileList(outgoing, maxResults));
  parts.push("", "Incoming imports:");
  parts.push(...formatFileList(incoming, maxResults));
  parts.push("", "Likely tests:");
  parts.push(...formatFileList(tests, maxResults));
  return parts.join("\n");
}

function formatFileList(files: string[], maxResults: number): string[] {
  if (files.length === 0) return ["- none found"];
  const shown = files.slice(0, maxResults).map(file => `- ${file}`);
  if (files.length > maxResults) shown.push(`- ... +${files.length - maxResults} more`);
  return shown;
}
