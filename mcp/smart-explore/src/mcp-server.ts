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
import { searchCodebase, formatSearchResults, collectSearchableFiles } from './search.js';
import { parseFile, formatFoldedView, unfoldSymbol } from './parser.js';
import { findCallers, findCallees, relatedFiles } from './relations.js';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const MAX_OUTLINE_DIRECTORY_FILES = 200;
const tools = [
  {
    name: 'smart_search',
    description:
      'Search codebase for symbols, functions, classes using tree-sitter AST parsing. Returns folded structural views with token counts. Use path parameter to scope the search.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search term — matches against symbol names, file names, and file content',
        },
        path: {
          type: 'string',
          description:
            'Root directory to search (default: current working directory)',
        },
        max_results: {
          type: 'number',
          description: 'Maximum results to return (default: 20)',
        },
        file_pattern: {
          type: 'string',
          description:
            'Substring filter for file paths (e.g. ".ts", "src/services")',
        },
        exclude_paths: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Directory paths to exclude before scanning, relative to path',
        },
        exclude_dirs: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Alias for exclude_paths',
        },
      },
      required: ['query'],
    },
    handler: async (args: any) => {
      const rootDir = resolve(args.path || process.cwd());
      const excludePaths = Array.isArray(args.exclude_paths)
        ? args.exclude_paths
        : Array.isArray(args.exclude_dirs)
          ? args.exclude_dirs
          : undefined;
      const result = await searchCodebase(rootDir, args.query, {
        maxResults: args.max_results || 20,
        filePattern: args.file_pattern,
        excludePaths,
      });
      const formatted = formatSearchResults(result, args.query);
      return { content: [{ type: 'text' as const, text: formatted }] };
    },
  },
  {
    name: 'smart_unfold',
    description:
      'Expand a specific symbol (function, class, method) from a file. Returns the full source code of just that symbol. Use after smart_search or smart_outline to read specific code.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the source file',
        },
        symbol_name: {
          type: 'string',
          description:
            'Name of the symbol to unfold (function, class, method, etc.)',
        },
      },
      required: ['file_path', 'symbol_name'],
    },
    handler: async (args: any) => {
      const filePath = resolve(args.file_path);
      const content = await readFile(filePath, 'utf-8');
      const unfolded = unfoldSymbol(content, filePath, args.symbol_name);
      if (unfolded) {
        return { content: [{ type: 'text' as const, text: unfolded }] };
      }
      const parsed = parseFile(content, filePath);
      if (parsed.symbols.length > 0) {
        const available = parsed.symbols
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
      'Get structural outline of a file or directory — shows all symbols (functions, classes, methods, types) with signatures but bodies folded. Much cheaper than reading the full source.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file or directory',
        },
      },
      required: ['file_path'],
    },
    handler: async (args: any) => {
      const filePath = resolve(args.file_path);
      const target = await stat(filePath);

      if (target.isDirectory()) {
        const { files, truncated } = await collectSearchableFiles(filePath, {
          projectRoot: filePath,
          maxFiles: MAX_OUTLINE_DIRECTORY_FILES,
        });

        const outlines: string[] = [];
        let skippedFiles = 0;

        for (const file of files) {
          const parsed = parseFile(file.content, file.relativePath, filePath);
          if (parsed.symbols.length > 0) {
            outlines.push(formatFoldedView(parsed));
          } else {
            skippedFiles++;
          }
        }

        if (outlines.length > 0) {
          const parts: string[] = [];
          if (truncated) {
            parts.push(
              `Directory outline limited to the first ${MAX_OUTLINE_DIRECTORY_FILES} files under ${args.file_path}. Narrow the path if you need more.`,
              ''
            );
          }
          if (skippedFiles > 0) {
            parts.push(`Skipped ${skippedFiles} unsupported or empty files.`, '');
          }
          parts.push(outlines.join('\n\n'));
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
        return {
          content: [{ type: 'text' as const, text: formatFoldedView(parsed) }],
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
      'Find incoming call edges for a symbol. Returns functions/methods that call the requested symbol, with call-site lines and resolved targets when available.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol_name: {
          type: 'string',
          description: 'Function or method name to find callers for, e.g. parseFile',
        },
        path: {
          type: 'string',
          description: 'Root directory to scan (default: current working directory)',
        },
        max_results: {
          type: 'number',
          description: 'Maximum call edges to return (default: 40)',
        },
        file_pattern: {
          type: 'string',
          description: 'Substring filter for scanned file paths (e.g. "src/")',
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
      'Find outgoing call edges for a symbol. Returns functions/methods called by the requested symbol, with call-site lines and resolved targets when available.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol_name: {
          type: 'string',
          description: 'Function or method name to inspect, e.g. searchCodebase',
        },
        path: {
          type: 'string',
          description: 'Root directory to scan (default: current working directory)',
        },
        max_results: {
          type: 'number',
          description: 'Maximum call edges to return (default: 40)',
        },
        file_pattern: {
          type: 'string',
          description: 'Substring filter for scanned file paths (e.g. "src/")',
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
      'Show dependency/file graph around one file: outgoing relative imports, incoming imports, and likely test files.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'File to inspect, relative to path or absolute',
        },
        path: {
          type: 'string',
          description: 'Project root directory (default: current working directory)',
        },
        max_results: {
          type: 'number',
          description: 'Maximum files per section (default: 40)',
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
];

// --- MCP Server setup ---

const server = new Server(
  { name: 'claude-mem', version: packageVersion },
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`[mcp-server] smart-explore v${packageVersion} ready\n`);
}

main().catch((err) => {
  process.stderr.write(`[mcp-server] Fatal: ${err.message}\n`);
  process.exit(1);
});
