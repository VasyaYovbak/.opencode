#!/usr/bin/env node
/**
 * Build script — bundles src/mcp-server.ts into scripts/mcp-server.cjs
 * Run with: node scripts/build.js
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync, chmodSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pkg = JSON.parse(readFileSync(`${__dirname}/../package.json`, 'utf-8'));
const version = pkg.version;

// tree-sitter grammar packages — loaded at runtime from node_modules
const TREE_SITTER_EXTERNAL = [
  'tree-sitter-cli',
  'tree-sitter-javascript',
  'tree-sitter-typescript',
  'tree-sitter-python',
  'tree-sitter-go',
  'tree-sitter-rust',
  'tree-sitter-ruby',
  'tree-sitter-java',
  'tree-sitter-c',
  'tree-sitter-cpp',
  'tree-sitter-kotlin',
  'tree-sitter-swift',
  'tree-sitter-php',
  'tree-sitter-elixir',
  '@tree-sitter-grammars/tree-sitter-lua',
  'tree-sitter-scala',
  'tree-sitter-bash',
  'tree-sitter-haskell',
  'tree-sitter-html',
  '@tree-sitter-grammars/tree-sitter-zig',
  'tree-sitter-css',
  'tree-sitter-scss',
  '@tree-sitter-grammars/tree-sitter-toml',
  '@tree-sitter-grammars/tree-sitter-yaml',
  '@derekstride/tree-sitter-sql',
  '@tree-sitter-grammars/tree-sitter-markdown',
];

console.log(`Building mcp-server v${version}...`);

await build({
  entryPoints: [`${__dirname}/../src/mcp-server.ts`],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: `${__dirname}/mcp-server.cjs`,
  minify: false,  // keep readable
  logLevel: 'info',
  external: TREE_SITTER_EXTERNAL,
  define: {
    '__DEFAULT_PACKAGE_VERSION__': `"${version}"`,
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
});

// Strip hardcoded __dirname/__filename paths injected by esbuild at build time.
// These shadow Node's runtime CJS globals and break path resolution on other machines.
const outFile = `${__dirname}/mcp-server.cjs`;
let content = readFileSync(outFile, 'utf-8');
const before = content.length;
const str = `(?:"[^"]*"|'[^']*')`;
for (const id of ['__dirname', '__filename']) {
  content = content.replace(new RegExp(`\\bvar ${id}\\s*=\\s*${str},\\s*`, 'g'), 'var ');
  content = content.replace(new RegExp(`\\bvar ${id}\\s*=\\s*${str};\\s*`, 'g'), '');
  content = content.replace(new RegExp(`,\\s*${id}\\s*=\\s*${str}`, 'g'), '');
}
content = content.replace(/\bvar\s*;/g, '');
if (content.length !== before) {
  writeFileSync(outFile, content);
  console.log(`  Stripped hardcoded __dirname/__filename (${before - content.length} bytes removed)`);
}

chmodSync(outFile, 0o755);
const stats = statSync(outFile);
console.log(`✓ scripts/mcp-server.cjs built (${(stats.size / 1024).toFixed(1)} KB)`);
