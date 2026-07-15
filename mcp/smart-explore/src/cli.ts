/**
 * Smart-explore CLI — subcommand interface to the same logic as the MCP server.
 *
 * Usage:
 *   smart-explore <command> [args]
 *
 * Commands:
 *   search <query> [query2 ...] [--path SUBDIR] [--file-pattern PAT] [--max-results N]
 *   outline <file_or_dir>
 *   unfold <file> <symbol> [<file> <symbol> ...]
 *   callers <symbol> [--path SUBDIR] [--file-pattern PAT] [--max-results N]
 *   callees <symbol> [--path SUBDIR] [--file-pattern PAT] [--max-results N]
 *   related <file> [--path SUBDIR] [--max-results N]
 *   index [--force]
 *   status
 *   --help, -h
 */

declare const __DEFAULT_PACKAGE_VERSION__: string;
const packageVersion =
  typeof __DEFAULT_PACKAGE_VERSION__ !== 'undefined'
    ? __DEFAULT_PACKAGE_VERSION__
    : '0.0.0-dev';

import { formatSearchResults, formatMultiSearchResults, mergeSearchResults, loadSearchPreviewMode } from './search.js';
import { parseFile, formatFoldedView, unfoldSymbolFromFolded } from './parser.js';
import { getDirectoryOutline, getFileOutline } from './outline-cache.js';
import { findCallers, findCallees, relatedFiles } from './relations.js';
import { isHashlineEditEnabled } from './hashline.js';
import { IndexStore, type SearchRow } from './index-store.js';
import { indexProject, spawnIndexer } from './indexer.js';
import { getProgressStatus } from './progress.js';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const MAX_OUTLINE_DIRECTORY_FILES = 200;

function formatProgressValue(value: number, digits = 1): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function formatIndexProgress(percent: number, filesProcessed: number, filesTotal: number, chunksIndexed: number, chunksTotal: number): string {
  return `${formatProgressValue(percent)}% (${formatProgressValue(filesProcessed, 2)}/${filesTotal} files, ${chunksIndexed}/${chunksTotal} chunks)`;
}

function parseArgs(argv: string[]): { command: string; positional: string[]; flags: Record<string, string | boolean> } {
  const args = argv.slice(2);
  if (args.length === 0) return { command: '', positional: [], flags: {} };
  const command = args[0];
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { command, positional, flags };
}

function emit(text: string): void {
  process.stdout.write(text + '\n');
}

function emitError(text: string, exitCode = 1): never {
  process.stderr.write(text + '\n');
  process.exit(exitCode);
}

async function cmdSearch(positional: string[], flags: Record<string, string | boolean>): Promise<void> {
  const queries = positional.map(q => q.trim()).filter(Boolean);
  if (queries.length === 0) emitError('Usage: smart-explore search <query> [query2 ...] [--path SUBDIR] [--file-pattern PAT] [--max-results N]');

  const rootDir = process.cwd();
  const maxResults = flags['max-results'] ? parseInt(flags['max-results'] as string, 10) : 20;
  const filePattern = (flags['file-pattern'] as string) || null;
  const pathPrefix = (flags['path'] as string) || null;

  const WAIT_MS = 90_000;
  const POLL_INTERVAL = 500;
  const deadline = Date.now() + WAIT_MS;

  if (!IndexStore.indexExists(rootDir)) {
    const prog0 = getProgressStatus(rootDir);
    if (!prog0 || prog0.status !== 'indexing') {
      try {
        spawnIndexer(rootDir);
      } catch (e) {
        emitError(`Failed to start indexing: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  let lastPct = 0;
  while (Date.now() < deadline) {
    const exists = IndexStore.indexExists(rootDir);
    const prog = getProgressStatus(rootDir);
    const indexing = prog?.status === 'indexing';
    if (exists && !indexing) break;
    if (prog?.status === 'error') {
      emitError(`Indexing failed: ${prog.error || 'unknown error'}.\nTry: smart-explore index --force`);
    }
    lastPct = prog?.percent ?? lastPct;
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }

  if (!IndexStore.indexExists(rootDir) || getProgressStatus(rootDir)?.status === 'indexing') {
    emit(`Index is still being built (${formatProgressValue(lastPct)}% complete). Retry in ~30s.`);
    return;
  }

  let store: IndexStore;
  try {
    store = await IndexStore.open(rootDir);
  } catch (e) {
    emitError(`Failed to open index: ${e instanceof Error ? e.message : String(e)}.\nTry: smart-explore index --force`);
  }

  try {
    if (queries.length === 1) {
      const rows: SearchRow[] = await store.search(queries[0], filePattern, maxResults, pathPrefix);
      const formatted = formatSearchResults(queries[0], rows, store.hasEmbedding, loadSearchPreviewMode());
      emit(formatted);
    } else {
      const allRows: SearchRow[][] = [];
      for (const query of queries) {
        const rows = await store.search(query, filePattern, maxResults, pathPrefix);
        allRows.push(rows);
      }
      const merged = mergeSearchResults(allRows).slice(0, maxResults);
      const formatted = formatMultiSearchResults(queries, merged, store.hasEmbedding, loadSearchPreviewMode());
      emit(formatted);
    }
  } finally {
    await store.close();
  }
}

async function cmdUnfold(positional: string[]): Promise<void> {
  if (positional.length < 2 || positional.length % 2 !== 0) {
    emitError('Usage: smart-explore unfold <file> <symbol> [<file> <symbol> ...]');
  }

  const results = await Promise.all(Array.from({ length: positional.length / 2 }, async (_, index) => {
    const inputPath = positional[index * 2];
    const symbolName = positional[index * 2 + 1];
    const filePath = resolve(inputPath);
    const fileOutline = await getFileOutline(filePath);
    const unfolded = unfoldSymbolFromFolded(fileOutline.content, filePath, fileOutline.foldedFile, symbolName);
    if (unfolded) return unfolded;
    if (fileOutline.foldedFile.symbols.length > 0) {
      const available = fileOutline.foldedFile.symbols
        .map((s) => s.children && s.children.length > 0
          ? `  - ${s.name} (${s.kind}, ${s.children.length} methods — use \`smart-explore outline ${inputPath}\` to list them)`
          : `  - ${s.name} (${s.kind})`)
        .join('\n');
      return `Symbol "${symbolName}" not found in ${inputPath}.\n\nAvailable symbols:\n${available}`;
    }
    return `Could not parse ${inputPath}. File may be unsupported or empty.`;
  }));

  emit(results.join('\n\n'));
}

async function cmdOutline(positional: string[]): Promise<void> {
  if (positional.length < 1) emitError('Usage: smart-explore outline <file_or_dir>');
  const filePath = resolve(positional[0]);
  const target = await stat(filePath);

  if (target.isDirectory()) {
    const { outlines, truncated, skipped } = await getDirectoryOutline(filePath, MAX_OUTLINE_DIRECTORY_FILES);

    if (outlines.length > 0) {
      const parts: string[] = [];
      if (truncated) {
        parts.push(
          `Directory outline limited to the first ${MAX_OUTLINE_DIRECTORY_FILES} files under ${positional[0]}. Narrow the path if you need more.`,
          '',
        );
      }
      if (skipped > 0) {
        parts.push(`Skipped ${skipped} unsupported or empty files.`, '');
      }
      parts.push(outlines.join('\n\n'));
      parts.push('');
      parts.push('── Actions ──');
      parts.push('  To read any symbol above: smart-explore unfold <file> <symbol>');
      emit(parts.join('\n'));
      return;
    }

    emit(`Could not parse ${positional[0]}. Directory may contain unsupported or empty files only.`);
    return;
  }

  const content = await readFile(filePath, 'utf-8');
  const parsed = parseFile(content, filePath);
  if (parsed.symbols.length > 0) {
    const text = formatFoldedView(parsed) + '\n\n── Actions ──\n  To read any symbol above: smart-explore unfold <file> <symbol>';
    emit(text);
    return;
  }
  emit(`Could not parse ${positional[0]}. File may use an unsupported language or be empty.`);
}

async function cmdCallers(positional: string[], flags: Record<string, string | boolean>): Promise<void> {
  if (positional.length < 1) emitError('Usage: smart-explore callers <symbol> [--path SUBDIR] [--file-pattern PAT] [--max-results N]');
  const rootDir = process.cwd();
  const text = await findCallers(rootDir, positional[0], {
    maxResults: flags['max-results'] ? parseInt(flags['max-results'] as string, 10) : 40,
    filePattern: (flags['file-pattern'] as string) || undefined,
    pathPrefix: (flags['path'] as string) || undefined,
  });
  emit(text);
}

async function cmdCallees(positional: string[], flags: Record<string, string | boolean>): Promise<void> {
  if (positional.length < 1) emitError('Usage: smart-explore callees <symbol> [--path SUBDIR] [--file-pattern PAT] [--max-results N]');
  const rootDir = process.cwd();
  const text = await findCallees(rootDir, positional[0], {
    maxResults: flags['max-results'] ? parseInt(flags['max-results'] as string, 10) : 40,
    filePattern: (flags['file-pattern'] as string) || undefined,
    pathPrefix: (flags['path'] as string) || undefined,
  });
  emit(text);
}

async function cmdRelated(positional: string[], flags: Record<string, string | boolean>): Promise<void> {
  if (positional.length < 1) emitError('Usage: smart-explore related <file> [--path SUBDIR] [--max-results N]');
  const rootDir = process.cwd();
  const text = await relatedFiles(rootDir, positional[0], {
    maxResults: flags['max-results'] ? parseInt(flags['max-results'] as string, 10) : 40,
    pathPrefix: (flags['path'] as string) || undefined,
  });
  emit(text);
}

async function cmdIndex(flags: Record<string, string | boolean>): Promise<void> {
  const rootDir = process.cwd();
  const force = flags.force === true;
  try {
    const result = await indexProject(rootDir, { force });
    emit(`Indexing complete for ${rootDir}`);
    emit(`  Files processed: ${result.filesProcessed}/${result.filesTotal}`);
    emit(`  Chunks indexed: ${result.chunksIndexed}`);
    emit(`  Deleted files: ${result.deletedFiles}`);
    emit(`  Duration: ${(result.duration / 1000).toFixed(1)}s`);
  } catch (e) {
    emitError(`Indexing failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function cmdStatus(flags: Record<string, string | boolean>): Promise<void> {
  const rootDir = process.cwd();
  const prog = getProgressStatus(rootDir);
  if (!prog) {
    const exists = IndexStore.indexExists(rootDir);
    emit(exists
      ? `Index exists but no progress file found. Index may be from a previous version. Try smart-explore search directly.`
      : `No index found for ${rootDir}. Use: smart-explore index`);
    return;
  }
  emit(`Index status for ${rootDir}`);
  emit(`  Status: ${prog.status}`);
  emit(`  Progress: ${formatIndexProgress(prog.percent, prog.filesProcessed, prog.filesTotal, prog.chunksIndexed, prog.chunksTotal)}`);
  if (prog.status === 'done' && prog.finishedAt) {
    emit(`  Completed in ${((prog.finishedAt - prog.startedAt) / 1000).toFixed(1)}s`);
  }
  if (prog.status === 'error' && prog.error) {
    emit(`  Error: ${prog.error}`);
  }
}

const HELP = `smart-explore v${packageVersion} — structural code exploration

Usage: smart-explore <command> [args]

Commands:
  search <query> [query2 ...] [--path SUBDIR] [--file-pattern PAT] [--max-results N]
          Semantic + BM25 code search. Concepts, behavior, "where is X handled?".
          Not exact strings (use grep). Auto-builds index on first run (blocks ≤90s).
          Pass multiple queries to merge + dedup results (e.g. "auth" "auth flow").
  outline <file_or_dir>
          Symbol signatures with bodies folded. Cheaper than reading full source.
  unfold <file> <symbol> [<file> <symbol> ...]
          Full source of one or more named symbols. Pass file/symbol pairs to batch reads.
  callers <symbol> [--path SUBDIR] [--file-pattern PAT] [--max-results N]
          Who calls a symbol.
  callees <symbol> [--path SUBDIR] [--file-pattern PAT] [--max-results N]
          What a symbol calls.
  related <file> [--path SUBDIR] [--max-results N]
          Import graph around a file.
  index [--force]
          Build/rebuild search index for current directory.
  status
          Poll index build progress for current directory.

--path is a SUBDIRECTORY FILTER (prefix match), not a root.
       The project root is always cwd. The index lives at <cwd>/.smart-explore-mcp-cache/.
       Example: --path src/auth/ → only results from files under src/auth/.

--file-pattern format:
  Substring or *.wildcard to narrow by extension/dir.
  No {brace} expansion, no **/glob paths.

Options:
  --help, -h    Show this help
  --version, -v Show version`;

async function main() {
  const rawArgs = process.argv.slice(2);

  if (rawArgs[0] === '--index' && rawArgs[1]) {
    const projectRoot = resolve(rawArgs[1]);
    const force = rawArgs.includes('--force');
    try {
      const result = await indexProject(projectRoot, { force });
      process.stderr.write(`Indexing complete for ${projectRoot}\n  Files processed: ${result.filesProcessed}\n  Chunks indexed: ${result.chunksIndexed}\n  Duration: ${(result.duration / 1000).toFixed(1)}s\n`);
      process.exit(0);
    } catch (e) {
      process.stderr.write(`Indexing failed: ${e instanceof Error ? e.message : String(e)}\n`);
      process.exit(1);
    }
  }

  const { command, positional, flags } = parseArgs(process.argv);

  if (!command || command === '--help' || command === '-h') {
    emit(HELP);
    return;
  }
  if (command === '--version' || command === '-v') {
    emit(packageVersion);
    return;
  }

  isHashlineEditEnabled();

  switch (command) {
    case 'search':
      await cmdSearch(positional, flags);
      break;
    case 'outline':
      await cmdOutline(positional);
      break;
    case 'unfold':
      await cmdUnfold(positional);
      break;
    case 'callers':
      await cmdCallers(positional, flags);
      break;
    case 'callees':
      await cmdCallees(positional, flags);
      break;
    case 'related':
      await cmdRelated(positional, flags);
      break;
    case 'index':
      await cmdIndex(flags);
      break;
    case 'status':
      await cmdStatus(flags);
      break;
    default:
      emitError(`Unknown command: ${command}\nRun 'smart-explore --help' for usage.`);
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
