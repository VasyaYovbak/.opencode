/**
 * Smart-explore MCP server — slim standalone build.
 *
 * Exposes structural code exploration tools:
 *   smart_search  — AST-indexed symbol search across a directory
 *   smart_outline — structural skeleton of a file or directory
 *   smart_unfold  — full source of one named symbol
 *   smart_callers — incoming call edges for a symbol
 *   smart_callees — outgoing call edges for a symbol
 *   smart_related_files — import/test file relationships
 *
 * No worker, no memory system, no external HTTP calls.
 * All business logic lives in parser.ts / search.ts.
 */

// Version injected at build time by esbuild define
declare const __DEFAULT_PACKAGE_VERSION__: string;
const packageVersion =
  typeof __DEFAULT_PACKAGE_VERSION__ !== 'undefined'
    ? __DEFAULT_PACKAGE_VERSION__
    : '0.0.0-dev';

// Redirect console.log → stderr so stdout stays clean for JSON-RPC
const _log = (...args: any[]) => process.stderr.write(args.join(' ') + '\n');
console['log'] = _log;

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { formatSearchResults, loadSearchPreviewMode } from './search.js';
import { parseFile, formatFoldedView, unfoldSymbolFromFolded } from './parser.js';
import { getDirectoryOutline, getFileOutline, warmDirectoryOutlineCache } from './outline-cache.js';
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

const tools = [
  {
    name: 'smart_search',
    description:
      'Semantic + BM25 code search. Use for concepts, behavior, "where is X handled?", unknown symbol names — not exact strings (use Grep). Auto-builds index on first call (blocks up to 90s). Returns ranked chunks grouped by file.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language or code terms.',
        },
        path: {
          type: 'string',
          description: 'Root dir (default: cwd)',
        },
        max_results: {
          type: 'number',
          description: 'Max results (default: 20)',
        },
        file_pattern: {
          type: 'string',
          description:
            'Substring or *.wildcard to narrow by ext/dir. No {brace} or **/glob.',
        },
      },
      required: ['query'],
    },
    handler: async (args: any) => {
      const rootDir = resolve(args.path || process.cwd());
      const maxResults = args.max_results || 20;
      const filePattern = args.file_pattern || null;

      // If index missing or still building, wait for indexing to complete (max 90s)
      const WAIT_MS = 90_000;
      const POLL_INTERVAL = 500;
      const deadline = Date.now() + WAIT_MS;

      if (!IndexStore.indexExists(rootDir)) {
        const prog0 = getProgressStatus(rootDir);
        if (!prog0 || prog0.status !== 'indexing') {
          try {
            spawnIndexer(rootDir);
          } catch (e) {
            return { content: [{ type: 'text' as const, text: `Failed to start indexing: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
          }
        }
      }

      // Poll until index exists AND no indexing is in progress (or timeout)
      let lastPct = 0;
      while (Date.now() < deadline) {
        const exists = IndexStore.indexExists(rootDir);
        const prog = getProgressStatus(rootDir);
        const indexing = prog?.status === 'indexing';
        if (exists && !indexing) break;
        if (prog?.status === 'error') {
          return { content: [{ type: 'text' as const, text: `Indexing failed: ${prog.error || 'unknown error'}.
Try smart_index to rebuild.` }], isError: true };
        }
        lastPct = prog?.percent ?? lastPct;
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
      }

      // If still not ready after timeout, tell the model to poll
      if (!IndexStore.indexExists(rootDir) || getProgressStatus(rootDir)?.status === 'indexing') {
        return {
          content: [{
            type: 'text' as const,
            text: `Index is still being built (${formatProgressValue(lastPct)}% complete). Indexing large projects can take a few minutes. Please wait and retry smart_search in ~30 seconds.`,
          }],
        };
      }

      let store: IndexStore;
      try {
        store = await IndexStore.open(rootDir);
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Failed to open index: ${e instanceof Error ? e.message : String(e)}.\nTry smart_index to rebuild.` }], isError: true };
      }

      try {
        const rows: SearchRow[] = await store.search(args.query, filePattern, maxResults);
        const formatted = formatSearchResults(args.query, rows, store.hasEmbedding, loadSearchPreviewMode());
        return { content: [{ type: 'text' as const, text: formatted }] };
      } finally {
        await store.close();
      }
    },
  },
  {
    name: 'smart_unfold',
    description:
      'Return full source of one named symbol (function/class/method). Use after smart_search or smart_outline instead of Read for code.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Source file path',
        },
        symbol_name: {
          type: 'string',
          description: 'Symbol name (function/class/method)',
        },
      },
      required: ['file_path', 'symbol_name'],
    },
    handler: async (args: any) => {
      const filePath = resolve(args.file_path);
      const fileOutline = await getFileOutline(filePath);
      const unfolded = unfoldSymbolFromFolded(fileOutline.content, filePath, fileOutline.foldedFile, args.symbol_name);
      if (unfolded) {
        return { content: [{ type: 'text' as const, text: unfolded }] };
      }
      if (fileOutline.foldedFile.symbols.length > 0) {
        const available = fileOutline.foldedFile.symbols
          .map((s) => `  - ${s.name} (${s.kind})`)
          .join('\n');
        return {
          content: [
            {
              type: 'text' as const,
              text: `Symbol "${args.symbol_name}" not found in ${args.file_path}.\n\nAvailable symbols:\n${available}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: `Could not parse ${args.file_path}. File may be unsupported or empty.`,
          },
        ],
      };
    },
  },
  {
    name: 'smart_outline',
    description:
      'Structural outline of a file or directory: all symbols with signatures, bodies folded. Cheaper than Read for code.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'File or directory path',
        },
      },
      required: ['file_path'],
    },
    handler: async (args: any) => {
      const filePath = resolve(args.file_path);
      const target = await stat(filePath);

      if (target.isDirectory()) {
        const { outlines, truncated, skipped, cached, parsed } = await getDirectoryOutline(filePath, MAX_OUTLINE_DIRECTORY_FILES);

        if (outlines.length > 0) {
          const parts: string[] = [];
          if (truncated) {
            parts.push(
              `Directory outline limited to the first ${MAX_OUTLINE_DIRECTORY_FILES} files under ${args.file_path}. Narrow the path if you need more.`,
              ''
            );
          }
          if (skipped > 0) {
            parts.push(`Skipped ${skipped} unsupported or empty files.`, '');
          }
          parts.push(outlines.join('\n\n'));
          parts.push('');
          parts.push('── Actions ──');
          parts.push('  To read any symbol above: use smart_unfold with file_path and symbol_name');
          parts.push('  Do NOT use Read with offset/limit — use smart_unfold instead');
          return {
            content: [{ type: 'text' as const, text: parts.join('\n') }],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Could not parse ${args.file_path}. Directory may contain unsupported or empty files only.`,
            },
          ],
        };
      }

      const content = await readFile(filePath, 'utf-8');
      const parsed = parseFile(content, filePath);
      if (parsed.symbols.length > 0) {
        const text = formatFoldedView(parsed) + '\n\n── Actions ──\n  To read any symbol above: use smart_unfold with file_path and symbol_name\n  Do NOT use Read with offset/limit — use smart_unfold instead';
        return {
          content: [{ type: 'text' as const, text }],
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: `Could not parse ${args.file_path}. File may use an unsupported language or be empty.`,
          },
        ],
      };
    },
  },
  {
    name: 'smart_callers',
    description:
      'Find who calls a symbol. Returns callers with call-site lines. Use for "who calls X?" instead of grepping.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol_name: {
          type: 'string',
          description: 'Symbol name',
        },
        path: {
          type: 'string',
          description: 'Root dir (default: cwd)',
        },
        max_results: {
          type: 'number',
          description: 'Max edges (default: 40)',
        },
        file_pattern: {
          type: 'string',
          description:
            'Substring or *.wildcard to narrow by ext/dir. No {brace} or **/glob.',
        },
      },
      required: ['symbol_name'],
    },
    handler: async (args: any) => {
      const rootDir = resolve(args.path || process.cwd());
      const text = await findCallers(rootDir, args.symbol_name, {
        maxResults: args.max_results || 40,
        filePattern: args.file_pattern,
      });
      return { content: [{ type: 'text' as const, text }] };
    },
  },
  {
    name: 'smart_callees',
    description:
      'Find what a symbol calls. Returns callees with call-site lines. Use for "what does X call?" instead of grepping.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol_name: {
          type: 'string',
          description: 'Symbol name',
        },
        path: {
          type: 'string',
          description: 'Root dir (default: cwd)',
        },
        max_results: {
          type: 'number',
          description: 'Max edges (default: 40)',
        },
        file_pattern: {
          type: 'string',
          description:
            'Substring or *.wildcard to narrow by ext/dir. No {brace} or **/glob.',
        },
      },
      required: ['symbol_name'],
    },
    handler: async (args: any) => {
      const rootDir = resolve(args.path || process.cwd());
      const text = await findCallees(rootDir, args.symbol_name, {
        maxResults: args.max_results || 40,
        filePattern: args.file_pattern,
      });
      return { content: [{ type: 'text' as const, text }] };
    },
  },
  {
    name: 'smart_related_files',
    description:
      'Import graph around one file: outgoing imports, incoming importers, likely test files.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'File path (relative to path or absolute)',
        },
        path: {
          type: 'string',
          description: 'Root dir (default: cwd)',
        },
        max_results: {
          type: 'number',
          description: 'Max files per section (default: 40)',
        },
      },
      required: ['file_path'],
    },
    handler: async (args: any) => {
      const rootDir = resolve(args.path || process.cwd());
      const text = await relatedFiles(rootDir, args.file_path, { maxResults: args.max_results || 40 });
      return { content: [{ type: 'text' as const, text }] };
    },
  },
  {
    name: 'smart_index',
    description:
      'Force rebuild search index. Use when index is missing, corrupted, or after embedding model changes.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Root dir (default: cwd)',
        },
        force: {
          type: 'boolean',
          description: 'Reindex unchanged files too (default: false)',
        },
      },
    },
    handler: async (args: any) => {
      const rootDir = resolve(args.path || process.cwd());
      const force = args.force ?? false;
      try {
        const result = await indexProject(rootDir, { force });
        const text = `Indexing complete for ${rootDir}\n` +
          `  Files processed: ${result.filesProcessed}/${result.filesTotal}\n` +
          `  Chunks indexed: ${result.chunksIndexed}\n` +
          `  Deleted files: ${result.deletedFiles}\n` +
          `  Duration: ${(result.duration / 1000).toFixed(1)}s`;
        return { content: [{ type: 'text' as const, text }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Indexing failed: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    },
  },
  {
    name: 'smart_index_status',
    description:
      'Poll index build progress. Use when smart_search reports indexing in progress.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Root dir (default: cwd)',
        },
      },
    },
    handler: async (args: any) => {
      const rootDir = resolve(args.path || process.cwd());
      const prog = getProgressStatus(rootDir);
      if (!prog) {
        const exists = IndexStore.indexExists(rootDir);
        const text = exists
          ? `Index exists but no progress file found. Index may be from a previous version. Try smart_search directly.`
          : `No index found for ${rootDir}. Use smart_index to build it.`;
        return { content: [{ type: 'text' as const, text }] };
      }
      const lines = [
        `Index status for ${rootDir}`,
        `  Status: ${prog.status}`,
        `  Progress: ${formatIndexProgress(prog.percent, prog.filesProcessed, prog.filesTotal, prog.chunksIndexed, prog.chunksTotal)}`,
      ];
      if (prog.status === 'done' && prog.finishedAt) {
        lines.push(`  Completed in ${((prog.finishedAt - prog.startedAt) / 1000).toFixed(1)}s`);
      }
      if (prog.status === 'error' && prog.error) {
        lines.push(`  Error: ${prog.error}`);
      }
      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  },
];

// --- MCP Server setup ---

const server = new Server(
  { name: 'smart-explore', version: packageVersion },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.name === request.params.name);
  if (!tool) throw new Error(`Unknown tool: ${request.params.name}`);
  try {
    return await tool.handler(request.params.arguments || {});
  } catch (error) {
    process.stderr.write(
      `[mcp-server] Tool ${request.params.name} failed: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--index' && args[1]) {
    const projectRoot = resolve(args[1]);
    const force = args.includes('--force');
    process.stderr.write(`[smart-explore] Indexing ${projectRoot}...\n`);
    try {
      const result = await indexProject(projectRoot, { force });
      process.stderr.write(
        `[smart-explore] Indexing complete: ${result.filesProcessed} files, ${result.chunksIndexed} chunks, ${(result.duration / 1000).toFixed(1)}s\n`
      );
      process.exit(0);
    } catch (e) {
      process.stderr.write(`[smart-explore] Indexing failed: ${e instanceof Error ? e.message : String(e)}\n`);
      process.exit(1);
    }
  }

  if (args[0] === '--warm-cache' && args[1]) {
    const projectRoot = resolve(args[1]);
    const force = args.includes('--force');
    const startedAt = Date.now();
    let lastProgress = '';
    let progressTimer: ReturnType<typeof setInterval> | undefined;

    const emitProgress = (stage: string, message: string) => {
      const line = `[smart-explore] WARM_PROGRESS ${stage} ${message}`;
      if (line === lastProgress) return;
      lastProgress = line;
      process.stderr.write(`${line}\n`);
    };

    process.stderr.write(`[smart-explore] Warming cache for ${projectRoot}...\n`);
    emitProgress('starting', `0% preparing ${projectRoot}`);
    try {
      progressTimer = setInterval(() => {
        const progress = getProgressStatus(projectRoot);
        if (!progress) return;
        if (progress.status === 'indexing') {
          emitProgress(
            'indexing',
            formatIndexProgress(
              progress.percent,
              progress.filesProcessed,
              progress.filesTotal,
              progress.chunksIndexed,
              progress.chunksTotal,
            ),
          );
        }
      }, 250);
      const indexResult = await indexProject(projectRoot, { force });
      if (progressTimer) clearInterval(progressTimer);
      progressTimer = undefined;
      emitProgress('outline', 'index complete, building outline cache');
      const outlineResult = await warmDirectoryOutlineCache(projectRoot);
      emitProgress(
        'done',
        `100% index ${indexResult.filesProcessed} files/${indexResult.chunksIndexed} chunks, outline ${outlineResult.parsed} parsed/${outlineResult.cached} cached`,
      );
      process.stderr.write(
        `[smart-explore] Cache warm complete: index ${indexResult.filesProcessed} files/${indexResult.chunksIndexed} chunks, outline ${outlineResult.parsed} parsed/${outlineResult.cached} cached, ${((Date.now() - startedAt) / 1000).toFixed(1)}s\n`
      );
      process.exit(0);
    } catch (e) {
      if (progressTimer) clearInterval(progressTimer);
      process.stderr.write(`[smart-explore] Cache warm failed: ${e instanceof Error ? e.message : String(e)}\n`);
      process.exit(1);
    }
  }

  isHashlineEditEnabled();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`[mcp-server] smart-explore v${packageVersion} ready\n`);
}

main().catch((err) => {
  process.stderr.write(`[mcp-server] Fatal: ${err.message}\n`);
  process.exit(1);
});
