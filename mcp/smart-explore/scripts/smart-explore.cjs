#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/search.ts
var import_promises = require("node:fs/promises");
var import_node_fs3 = require("node:fs");
var import_node_os3 = require("node:os");
var import_node_path3 = require("node:path");

// src/parser.ts
var import_node_child_process = require("node:child_process");
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var import_node_os2 = require("node:os");
var import_node_module = require("node:module");

// src/hashline.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_node_os = require("node:os");
var NIBBLE_STR = "ZPMQVRWSNKTXJBYH";
var HASHLINE_DICT = Array.from({ length: 256 }, (_, i) => {
  const high = i >>> 4;
  const low = i & 15;
  return `${NIBBLE_STR[high]}${NIBBLE_STR[low]}`;
});
var PRIME32_1 = 2654435761;
var PRIME32_2 = 2246822519;
var PRIME32_3 = 3266489917;
var PRIME32_4 = 668265263;
var PRIME32_5 = 374761393;
var encoder = new TextEncoder();
function rotateLeft32(value, bits) {
  return (value << bits | value >>> 32 - bits) >>> 0;
}
function readUint32LittleEndian(input, offset) {
  return ((input[offset] ?? 0) | (input[offset + 1] ?? 0) << 8 | (input[offset + 2] ?? 0) << 16 | (input[offset + 3] ?? 0) << 24) >>> 0;
}
function round32(accumulator, value) {
  const added = accumulator + Math.imul(value, PRIME32_2) >>> 0;
  return Math.imul(rotateLeft32(added, 13), PRIME32_1) >>> 0;
}
function xxHash32Js(input, seed) {
  let offset = 0;
  const length = input.length;
  let hash;
  if (length >= 16) {
    const limit = length - 16;
    let v1 = seed + PRIME32_1 + PRIME32_2 >>> 0;
    let v2 = seed + PRIME32_2 >>> 0;
    let v3 = seed >>> 0;
    let v4 = seed - PRIME32_1 >>> 0;
    while (offset <= limit) {
      v1 = round32(v1, readUint32LittleEndian(input, offset));
      offset += 4;
      v2 = round32(v2, readUint32LittleEndian(input, offset));
      offset += 4;
      v3 = round32(v3, readUint32LittleEndian(input, offset));
      offset += 4;
      v4 = round32(v4, readUint32LittleEndian(input, offset));
      offset += 4;
    }
    hash = rotateLeft32(v1, 1) + rotateLeft32(v2, 7) >>> 0;
    hash = hash + rotateLeft32(v3, 12) >>> 0;
    hash = hash + rotateLeft32(v4, 18) >>> 0;
  } else {
    hash = seed + PRIME32_5 >>> 0;
  }
  hash = hash + length >>> 0;
  while (offset + 4 <= length) {
    hash = hash + Math.imul(readUint32LittleEndian(input, offset), PRIME32_3) >>> 0;
    hash = Math.imul(rotateLeft32(hash, 17), PRIME32_4) >>> 0;
    offset += 4;
  }
  while (offset < length) {
    hash = hash + Math.imul(input[offset] ?? 0, PRIME32_5) >>> 0;
    hash = Math.imul(rotateLeft32(hash, 11), PRIME32_1) >>> 0;
    offset += 1;
  }
  hash = (hash ^ hash >>> 15) >>> 0;
  hash = Math.imul(hash, PRIME32_2) >>> 0;
  hash = (hash ^ hash >>> 13) >>> 0;
  hash = Math.imul(hash, PRIME32_3) >>> 0;
  return (hash ^ hash >>> 16) >>> 0;
}
function hashXxh32(input, seed) {
  return xxHash32Js(encoder.encode(input), seed >>> 0);
}
var RE_SIGNIFICANT = /[\p{L}\p{N}]/u;
function computeLineHash(lineNumber, content) {
  const normalized = content.replace(/\r/g, "").trimEnd();
  const seed = RE_SIGNIFICANT.test(normalized) ? 0 : lineNumber;
  const index = hashXxh32(normalized, seed) % 256;
  return HASHLINE_DICT[index];
}
function formatHashLine(lineNumber, content) {
  const hash = computeLineHash(lineNumber, content);
  return `${lineNumber}#${hash}|${content}`;
}
function lineAnchor(lineNumber, content) {
  return `${lineNumber}#${computeLineHash(lineNumber, content)}`;
}
var cachedEnabled = null;
function stripJsonComments(text) {
  let out = "";
  let i = 0;
  let inString = false;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (ch === "\\" && i + 1 < n) {
        out += text[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}
function resolveOpencodeConfigDirs() {
  const dirs = /* @__PURE__ */ new Set();
  const custom = process.env.OPENCODE_CONFIG_DIR?.trim();
  if (custom) dirs.add(custom);
  const xdg = process.env.XDG_CONFIG_HOME?.trim() || (0, import_node_path.join)((0, import_node_os.homedir)(), ".config");
  dirs.add((0, import_node_path.join)(xdg, "opencode"));
  return [...dirs];
}
function readHashlineEditFlag() {
  const basenames = ["oh-my-openagent", "oh-my-opencode"];
  const exts = [".json", ".jsonc"];
  for (const dir of resolveOpencodeConfigDirs()) {
    for (const base of basenames) {
      for (const ext of exts) {
        const candidate = (0, import_node_path.join)(dir, base + ext);
        if (!(0, import_node_fs.existsSync)(candidate)) continue;
        try {
          const raw = (0, import_node_fs.readFileSync)(candidate, "utf-8");
          const parsed = JSON.parse(stripJsonComments(raw));
          if (parsed && typeof parsed === "object" && typeof parsed.hashline_edit === "boolean") {
            return parsed.hashline_edit;
          }
        } catch {
        }
      }
    }
  }
  return false;
}
function isHashlineEditEnabled() {
  if (cachedEnabled === null) {
    cachedEnabled = readHashlineEditFlag();
  }
  return cachedEnabled;
}

// src/parser.ts
var _require = (0, import_node_module.createRequire)(__filename);
var LANG_MAP = {
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".jsx": "tsx",
  ".ts": "typescript",
  ".tsx": "tsx",
  ".py": "python",
  ".pyw": "python",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".java": "java",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".hh": "cpp",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".swift": "swift",
  ".php": "php",
  ".ex": "elixir",
  ".exs": "elixir",
  ".lua": "lua",
  ".scala": "scala",
  ".sc": "scala",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
  ".hs": "haskell",
  ".zig": "zig",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "scss",
  ".toml": "toml",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".sql": "sql",
  ".md": "markdown",
  ".mdx": "markdown"
};
function detectLanguageWithUserGrammars(filePath, userConfig) {
  const ext = filePath.slice(filePath.lastIndexOf("."));
  if (LANG_MAP[ext]) return LANG_MAP[ext];
  if (userConfig.extensionToLanguage[ext]) return userConfig.extensionToLanguage[ext];
  return "unknown";
}
function getUserAwareQueryKey(language, userConfig) {
  if (userConfig.languageToQueryKey[language]) {
    return userConfig.languageToQueryKey[language];
  }
  return getQueryKey(language);
}
var userGrammarCache = /* @__PURE__ */ new Map();
var EMPTY_USER_GRAMMAR_CONFIG = {
  grammars: {},
  extensionToLanguage: {},
  languageToQueryKey: {}
};
function loadUserGrammars(projectRoot) {
  if (userGrammarCache.has(projectRoot)) return userGrammarCache.get(projectRoot);
  const configPath = (0, import_node_path2.join)(projectRoot, ".claude-mem.json");
  let rawConfig;
  try {
    const content = (0, import_node_fs2.readFileSync)(configPath, "utf-8");
    rawConfig = JSON.parse(content);
  } catch {
    userGrammarCache.set(projectRoot, EMPTY_USER_GRAMMAR_CONFIG);
    return EMPTY_USER_GRAMMAR_CONFIG;
  }
  const grammarsRaw = rawConfig.grammars;
  if (!grammarsRaw || typeof grammarsRaw !== "object" || Array.isArray(grammarsRaw)) {
    userGrammarCache.set(projectRoot, EMPTY_USER_GRAMMAR_CONFIG);
    return EMPTY_USER_GRAMMAR_CONFIG;
  }
  const config = {
    grammars: {},
    extensionToLanguage: {},
    languageToQueryKey: {}
  };
  for (const [language, entry] of Object.entries(grammarsRaw)) {
    if (GRAMMAR_PACKAGES[language]) continue;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const typedEntry = entry;
    const pkg2 = typedEntry.package;
    const extensions = typedEntry.extensions;
    const queryPath = typedEntry.query;
    if (typeof pkg2 !== "string" || !Array.isArray(extensions)) continue;
    if (!extensions.every((e) => typeof e === "string")) continue;
    config.grammars[language] = {
      package: pkg2,
      extensions,
      query: typeof queryPath === "string" ? queryPath : void 0
    };
    for (const ext of extensions) {
      if (!LANG_MAP[ext]) {
        config.extensionToLanguage[ext] = language;
      }
    }
    if (typeof queryPath === "string") {
      const fullQueryPath = (0, import_node_path2.join)(projectRoot, queryPath);
      try {
        const queryContent = (0, import_node_fs2.readFileSync)(fullQueryPath, "utf-8");
        const queryKey = `user_${language}`;
        QUERIES[queryKey] = queryContent;
        config.languageToQueryKey[language] = queryKey;
      } catch {
        console.error(`[smart-file-read] Custom query file not found: ${fullQueryPath}, falling back to generic`);
        config.languageToQueryKey[language] = "generic";
      }
    } else {
      config.languageToQueryKey[language] = "generic";
    }
  }
  userGrammarCache.set(projectRoot, config);
  return config;
}
var GRAMMAR_PACKAGES = {
  javascript: "tree-sitter-javascript",
  typescript: "tree-sitter-typescript/typescript",
  tsx: "tree-sitter-typescript/tsx",
  python: "tree-sitter-python",
  go: "tree-sitter-go",
  rust: "tree-sitter-rust",
  ruby: "tree-sitter-ruby",
  java: "tree-sitter-java",
  c: "tree-sitter-c",
  cpp: "tree-sitter-cpp",
  kotlin: "tree-sitter-kotlin",
  swift: "tree-sitter-swift",
  php: "tree-sitter-php/php",
  elixir: "tree-sitter-elixir",
  lua: "@tree-sitter-grammars/tree-sitter-lua",
  scala: "tree-sitter-scala",
  bash: "tree-sitter-bash",
  haskell: "tree-sitter-haskell",
  zig: "@tree-sitter-grammars/tree-sitter-zig",
  html: "tree-sitter-html",
  css: "tree-sitter-css",
  scss: "tree-sitter-scss",
  toml: "@tree-sitter-grammars/tree-sitter-toml",
  yaml: "@tree-sitter-grammars/tree-sitter-yaml",
  sql: "@derekstride/tree-sitter-sql",
  markdown: "@tree-sitter-grammars/tree-sitter-markdown"
};
var GRAMMAR_SUBDIR = {
  markdown: "tree-sitter-markdown"
};
function resolveGrammarPath(language) {
  const pkg2 = GRAMMAR_PACKAGES[language];
  if (!pkg2) return null;
  const subdir = GRAMMAR_SUBDIR[language];
  if (subdir) {
    try {
      const rootPkgPath = _require.resolve(pkg2 + "/package.json");
      const resolved = (0, import_node_path2.join)((0, import_node_path2.dirname)(rootPkgPath), subdir);
      if ((0, import_node_fs2.existsSync)((0, import_node_path2.join)(resolved, "src"))) return resolved;
    } catch {
    }
    return null;
  }
  try {
    const packageJsonPath = _require.resolve(pkg2 + "/package.json");
    return (0, import_node_path2.dirname)(packageJsonPath);
  } catch {
    return null;
  }
}
function resolveGrammarPathWithFallback(language, projectRoot) {
  const bundled = resolveGrammarPath(language);
  if (bundled) return bundled;
  if (!projectRoot) return null;
  const userConfig = loadUserGrammars(projectRoot);
  const entry = userConfig.grammars[language];
  if (!entry) return null;
  try {
    const packageJsonPath = (0, import_node_path2.join)(projectRoot, "node_modules", entry.package, "package.json");
    if ((0, import_node_fs2.existsSync)(packageJsonPath)) {
      const grammarDir = (0, import_node_path2.dirname)(packageJsonPath);
      if ((0, import_node_fs2.existsSync)((0, import_node_path2.join)(grammarDir, "src"))) return grammarDir;
    }
  } catch {
  }
  console.error(`[smart-file-read] Grammar package not found for "${language}": ${entry.package} (install it in your project's node_modules)`);
  return null;
}
var QUERIES = {
  jsts: `
(function_declaration name: (identifier) @name) @func
(lexical_declaration (variable_declarator name: (identifier) @name value: [(arrow_function) (function_expression)])) @const_func
(lexical_declaration (variable_declarator name: (identifier) @name value: [(array) (object) (new_expression) (ternary_expression)])) @const_var
(class_declaration name: (type_identifier) @name) @cls
(method_definition name: (property_identifier) @name) @method
(interface_declaration name: (type_identifier) @name) @iface
(type_alias_declaration name: (type_identifier) @name) @tdef
(enum_declaration name: (identifier) @name) @enm
(import_statement) @imp
(export_statement) @exp
`,
  python: `
(function_definition name: (identifier) @name) @func
(class_definition name: (identifier) @name) @cls
(import_statement) @imp
(import_from_statement) @imp
`,
  go: `
(function_declaration name: (identifier) @name) @func
(method_declaration name: (field_identifier) @name) @method
(type_declaration (type_spec name: (type_identifier) @name)) @tdef
(import_declaration) @imp
`,
  rust: `
(function_item name: (identifier) @name) @func
(struct_item name: (type_identifier) @name) @struct_def
(enum_item name: (type_identifier) @name) @enm
(trait_item name: (type_identifier) @name) @trait_def
(impl_item type: (type_identifier) @name) @impl_def
(use_declaration) @imp
`,
  ruby: `
(method name: (identifier) @name) @func
(class name: (constant) @name) @cls
(module name: (constant) @name) @cls
(call method: (identifier) @name) @imp
`,
  java: `
(method_declaration name: (identifier) @name) @method
(class_declaration name: (identifier) @name) @cls
(interface_declaration name: (identifier) @name) @iface
(enum_declaration name: (identifier) @name) @enm
(import_declaration) @imp
`,
  kotlin: `
(function_declaration (simple_identifier) @name) @func
(class_declaration (type_identifier) @name) @cls
(object_declaration (type_identifier) @name) @cls
(import_header) @imp
`,
  swift: `
(function_declaration name: (simple_identifier) @name) @func
(class_declaration name: (type_identifier) @name) @cls
(protocol_declaration name: (type_identifier) @name) @iface
(import_declaration) @imp
`,
  php: `
(function_definition name: (name) @name) @func
(class_declaration name: (name) @name) @cls
(interface_declaration name: (name) @name) @iface
(trait_declaration name: (name) @name) @trait_def
(method_declaration name: (name) @name) @method
(namespace_use_declaration) @imp
`,
  lua: `
(function_declaration name: (identifier) @name) @func
(function_declaration name: (dot_index_expression) @name) @func
(function_declaration name: (method_index_expression) @name) @func
`,
  scala: `
(function_definition name: (identifier) @name) @func
(class_definition name: (identifier) @name) @cls
(object_definition name: (identifier) @name) @cls
(trait_definition name: (identifier) @name) @trait_def
(import_declaration) @imp
`,
  bash: `
(function_definition name: (word) @name) @func
`,
  haskell: `
(function name: (variable) @name) @func
(type_synomym name: (name) @name) @tdef
(newtype name: (name) @name) @tdef
(data_type name: (name) @name) @tdef
(class name: (name) @name) @cls
(import) @imp
`,
  zig: `
(function_declaration name: (identifier) @name) @func
(test_declaration) @func
`,
  html: `
(element
  (start_tag
    (tag_name) @tag
    (attribute
      (attribute_name) @attr_name
      (quoted_attribute_value (attribute_value) @name))) @cls
  (#eq? @attr_name "id"))
`,
  css: `
(rule_set (selectors) @name) @func
(media_statement) @cls
(keyframes_statement (keyframes_name) @name) @cls
(import_statement) @imp
`,
  scss: `
(rule_set (selectors) @name) @func
(media_statement) @cls
(keyframes_statement (keyframes_name) @name) @cls
(import_statement) @imp
(mixin_statement name: (identifier) @name) @mixin_def
(function_statement name: (identifier) @name) @func
(include_statement) @imp
`,
  toml: `
(table (bare_key) @name) @cls
(table (dotted_key) @name) @cls
(table_array_element (bare_key) @name) @cls
(table_array_element (dotted_key) @name) @cls
`,
  yaml: `
(block_mapping_pair key: (flow_node) @name) @func
`,
  sql: `
(create_table (object_reference) @name) @cls
(create_function (object_reference) @name) @func
(create_view (object_reference) @name) @cls
`,
  markdown: `
(atx_heading heading_content: (inline) @name) @heading
(setext_heading heading_content: (paragraph) @name) @heading
(fenced_code_block (info_string (language) @name)) @code_block
(fenced_code_block) @code_block
(minus_metadata) @frontmatter
(link_reference_definition (link_label) @name) @ref
`,
  generic: `
(function_declaration name: (identifier) @name) @func
(function_definition name: (identifier) @name) @func
(class_declaration name: (identifier) @name) @cls
(class_definition name: (identifier) @name) @cls
(import_statement) @imp
(import_declaration) @imp
`
};
function getQueryKey(language) {
  switch (language) {
    case "javascript":
    case "typescript":
    case "tsx":
      return "jsts";
    case "python":
      return "python";
    case "go":
      return "go";
    case "rust":
      return "rust";
    case "ruby":
      return "ruby";
    case "java":
      return "java";
    case "kotlin":
      return "kotlin";
    case "swift":
      return "swift";
    case "php":
      return "php";
    case "elixir":
      return "generic";
    case "lua":
      return "lua";
    case "scala":
      return "scala";
    case "bash":
      return "bash";
    case "haskell":
      return "haskell";
    case "zig":
      return "zig";
    case "html":
      return "html";
    case "css":
      return "css";
    case "scss":
      return "scss";
    case "toml":
      return "toml";
    case "yaml":
      return "yaml";
    case "sql":
      return "sql";
    case "markdown":
      return "markdown";
    default:
      return "generic";
  }
}
var queryTmpDir = null;
var queryFileCache = /* @__PURE__ */ new Map();
function getQueryFile(queryKey) {
  if (queryFileCache.has(queryKey)) return queryFileCache.get(queryKey);
  if (!queryTmpDir) {
    queryTmpDir = (0, import_node_fs2.mkdtempSync)((0, import_node_path2.join)((0, import_node_os2.tmpdir)(), "smart-read-queries-"));
  }
  const filePath = (0, import_node_path2.join)(queryTmpDir, `${queryKey}.scm`);
  (0, import_node_fs2.writeFileSync)(filePath, QUERIES[queryKey]);
  queryFileCache.set(queryKey, filePath);
  return filePath;
}
var cachedBinPath = null;
function getTreeSitterBin() {
  if (cachedBinPath) return cachedBinPath;
  try {
    const pkgPath = _require.resolve("tree-sitter-cli/package.json");
    const binPath = (0, import_node_path2.join)((0, import_node_path2.dirname)(pkgPath), "tree-sitter");
    if ((0, import_node_fs2.existsSync)(binPath)) {
      cachedBinPath = binPath;
      return binPath;
    }
  } catch {
  }
  cachedBinPath = "tree-sitter";
  return cachedBinPath;
}
function runQuery(queryFile, sourceFile, grammarPath) {
  const result = runBatchQuery(queryFile, [sourceFile], grammarPath);
  return result.get(sourceFile) || [];
}
function runBatchQuery(queryFile, sourceFiles, grammarPath) {
  if (sourceFiles.length === 0) return /* @__PURE__ */ new Map();
  const bin = getTreeSitterBin();
  const execArgs = ["query", "-p", grammarPath, queryFile, ...sourceFiles];
  let output;
  try {
    output = (0, import_node_child_process.execFileSync)(bin, execArgs, { encoding: "utf-8", timeout: 3e4, stdio: ["pipe", "pipe", "pipe"] });
  } catch {
    return /* @__PURE__ */ new Map();
  }
  return parseMultiFileQueryOutput(output);
}
function parseMultiFileQueryOutput(output) {
  const fileMatches = /* @__PURE__ */ new Map();
  let currentFile = null;
  let currentMatch = null;
  for (const line of output.split("\n")) {
    if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("	")) {
      currentFile = line.trim();
      if (!fileMatches.has(currentFile)) {
        fileMatches.set(currentFile, []);
      }
      currentMatch = null;
      continue;
    }
    if (!currentFile) continue;
    const patternMatch = line.match(/^\s+pattern:\s+(\d+)/);
    if (patternMatch) {
      currentMatch = { pattern: parseInt(patternMatch[1]), captures: [] };
      fileMatches.get(currentFile).push(currentMatch);
      continue;
    }
    const captureMatch = line.match(
      /^\s+capture:\s+(?:\d+\s*-\s*)?(\w+),\s*start:\s*\((\d+),\s*(\d+)\),\s*end:\s*\((\d+),\s*(\d+)\)(?:,\s*text:\s*`([^`]*)`)?/
    );
    if (captureMatch && currentMatch) {
      currentMatch.captures.push({
        tag: captureMatch[1],
        startRow: parseInt(captureMatch[2]),
        startCol: parseInt(captureMatch[3]),
        endRow: parseInt(captureMatch[4]),
        endCol: parseInt(captureMatch[5]),
        text: captureMatch[6]
      });
    }
  }
  return fileMatches;
}
var KIND_MAP = {
  func: "function",
  const_func: "function",
  const_var: "const",
  cls: "class",
  method: "method",
  iface: "interface",
  tdef: "type",
  enm: "enum",
  struct_def: "struct",
  trait_def: "trait",
  impl_def: "impl",
  mixin_def: "mixin",
  heading: "section",
  code_block: "code",
  frontmatter: "metadata",
  ref: "reference"
};
var CONTAINER_KINDS = /* @__PURE__ */ new Set(["class", "struct", "impl", "trait"]);
function extractSignatureFromLines(lines, startRow, endRow, maxLen = 200) {
  const firstLine = lines[startRow] || "";
  let sig = firstLine;
  if (!sig.trimEnd().endsWith("{") && !sig.trimEnd().endsWith(":")) {
    const chunk = lines.slice(startRow, Math.min(startRow + 10, endRow + 1)).join("\n");
    const braceIdx = chunk.indexOf("{");
    if (braceIdx !== -1 && braceIdx < 500) {
      sig = chunk.slice(0, braceIdx).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    }
  }
  sig = sig.replace(/\s*[{:]\s*$/, "").trim();
  if (sig.length > maxLen) sig = sig.slice(0, maxLen - 3) + "...";
  return sig;
}
function findCommentAbove(lines, startRow) {
  const commentLines = [];
  let foundComment = false;
  for (let i = startRow - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === "") {
      if (foundComment) break;
      continue;
    }
    if (trimmed.startsWith("/**") || trimmed.startsWith("*") || trimmed.startsWith("*/") || trimmed.startsWith("//") || trimmed.startsWith("///") || trimmed.startsWith("//!") || trimmed.startsWith("#") || trimmed.startsWith("@")) {
      commentLines.unshift(lines[i]);
      foundComment = true;
    } else {
      break;
    }
  }
  return commentLines.length > 0 ? commentLines.join("\n").trim() : void 0;
}
function findPythonDocstringFromLines(lines, startRow, endRow) {
  for (let i = startRow + 1; i <= Math.min(startRow + 3, endRow); i++) {
    const trimmed = lines[i]?.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) return trimmed;
    break;
  }
  return void 0;
}
function isExported(name, startRow, endRow, exportRanges, lines, language) {
  switch (language) {
    case "javascript":
    case "typescript":
    case "tsx":
      return exportRanges.some((r) => startRow >= r.startRow && endRow <= r.endRow);
    case "python":
      return !name.startsWith("_");
    case "go":
      return name.length > 0 && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase();
    case "rust":
      return lines[startRow]?.trimStart().startsWith("pub") ?? false;
    default:
      return true;
  }
}
function buildSymbols(matches, lines, language) {
  const symbols = [];
  const imports = [];
  const exportRanges = [];
  const containers = [];
  const hashlineEnabled = isHashlineEditEnabled();
  for (const match of matches) {
    for (const cap of match.captures) {
      if (cap.tag === "exp") {
        exportRanges.push({ startRow: cap.startRow, endRow: cap.endRow });
      }
      if (cap.tag === "imp") {
        imports.push(cap.text || lines[cap.startRow]?.trim() || "");
      }
    }
  }
  for (const match of matches) {
    const kindCapture = match.captures.find((c) => KIND_MAP[c.tag]);
    const nameCapture = match.captures.find((c) => c.tag === "name");
    if (!kindCapture) continue;
    const startRow = kindCapture.startRow;
    const endRow = kindCapture.endRow;
    const kind = KIND_MAP[kindCapture.tag];
    const name = nameCapture?.text || "anonymous";
    let signature;
    if (language === "markdown" && kind === "section") {
      const headingLine = lines[startRow] || "";
      const hashMatch = headingLine.match(/^(#{1,6})\s/);
      const level = hashMatch ? hashMatch[1].length : 1;
      signature = `${"#".repeat(level)} ${name}`;
    } else if (language === "markdown" && kind === "code") {
      const langTag = name !== "anonymous" ? name : "";
      signature = langTag ? "```" + langTag : "```";
    } else if (language === "markdown" && kind === "metadata") {
      signature = "---frontmatter---";
    } else if (language === "markdown" && kind === "reference") {
      signature = lines[startRow]?.trim() || name;
    } else {
      signature = extractSignatureFromLines(lines, startRow, endRow);
    }
    const comment = language === "markdown" ? void 0 : findCommentAbove(lines, startRow);
    const docstring = language === "python" ? findPythonDocstringFromLines(lines, startRow, endRow) : void 0;
    const sym = {
      name,
      kind,
      signature,
      jsdoc: comment || docstring,
      lineStart: startRow,
      lineEnd: endRow,
      exported: isExported(name, startRow, endRow, exportRanges, lines, language)
    };
    if (hashlineEnabled) {
      sym.hashStart = lineAnchor(sym.lineStart + 1, (lines[sym.lineStart] ?? "").replace(/\r$/, ""));
      sym.hashEnd = lineAnchor(sym.lineEnd + 1, (lines[sym.lineEnd] ?? "").replace(/\r$/, ""));
    }
    if (CONTAINER_KINDS.has(kind)) {
      sym.children = [];
      containers.push({ sym, startRow, endRow });
    }
    symbols.push(sym);
  }
  if (language === "markdown") {
    const codeBlocksByRange = /* @__PURE__ */ new Map();
    const duplicateCodeBlocks = /* @__PURE__ */ new Set();
    for (const sym of symbols) {
      if (sym.kind !== "code") continue;
      const rangeKey = `${sym.lineStart}:${sym.lineEnd}`;
      const existing = codeBlocksByRange.get(rangeKey);
      if (existing) {
        if (sym.name !== "anonymous") {
          duplicateCodeBlocks.add(existing);
          codeBlocksByRange.set(rangeKey, sym);
        } else {
          duplicateCodeBlocks.add(sym);
        }
      } else {
        codeBlocksByRange.set(rangeKey, sym);
      }
    }
    if (duplicateCodeBlocks.size > 0) {
      const filtered = symbols.filter((s) => !duplicateCodeBlocks.has(s));
      symbols.length = 0;
      symbols.push(...filtered);
    }
  }
  const scopeRanges = [];
  for (const sym of symbols) {
    if (sym.kind === "function" || sym.kind === "const") {
      scopeRanges.push({ startRow: sym.lineStart, endRow: sym.lineEnd });
    }
  }
  for (const container of containers) {
    scopeRanges.push({ startRow: container.startRow, endRow: container.endRow });
  }
  if (scopeRanges.length > 0) {
    const nestedConstVars = /* @__PURE__ */ new Set();
    for (const sym of symbols) {
      if (sym.kind !== "const") continue;
      for (const range of scopeRanges) {
        if (sym.lineStart > range.startRow && sym.lineEnd <= range.endRow) {
          nestedConstVars.add(sym);
          break;
        }
      }
    }
    if (nestedConstVars.size > 0) {
      const filtered = symbols.filter((s) => !nestedConstVars.has(s));
      symbols.length = 0;
      symbols.push(...filtered);
    }
  }
  const nested = /* @__PURE__ */ new Set();
  for (const container of containers) {
    for (const sym of symbols) {
      if (sym === container.sym) continue;
      if (sym.lineStart > container.startRow && sym.lineEnd <= container.endRow) {
        if (sym.kind === "function") sym.kind = "method";
        container.sym.children.push(sym);
        nested.add(sym);
      }
    }
  }
  return { symbols: symbols.filter((s) => !nested.has(s)), imports };
}
function parseFile(content, filePath, projectRoot) {
  const userConfig = projectRoot ? loadUserGrammars(projectRoot) : EMPTY_USER_GRAMMAR_CONFIG;
  const language = detectLanguageWithUserGrammars(filePath, userConfig);
  const lines = content.split("\n");
  const grammarPath = resolveGrammarPathWithFallback(language, projectRoot);
  if (!grammarPath) {
    return {
      filePath,
      language,
      symbols: [],
      imports: [],
      totalLines: lines.length,
      foldedTokenEstimate: 50
    };
  }
  const queryKey = getUserAwareQueryKey(language, userConfig);
  const queryFile = getQueryFile(queryKey);
  const ext = filePath.slice(filePath.lastIndexOf(".")) || ".txt";
  const tmpDir = (0, import_node_fs2.mkdtempSync)((0, import_node_path2.join)((0, import_node_os2.tmpdir)(), "smart-src-"));
  const tmpFile = (0, import_node_path2.join)(tmpDir, `source${ext}`);
  (0, import_node_fs2.writeFileSync)(tmpFile, content);
  try {
    const matches = runQuery(queryFile, tmpFile, grammarPath);
    const result = buildSymbols(matches, lines, language);
    const folded = formatFoldedView({
      filePath,
      language,
      symbols: result.symbols,
      imports: result.imports,
      totalLines: lines.length,
      foldedTokenEstimate: 0
    });
    return {
      filePath,
      language,
      symbols: result.symbols,
      imports: result.imports,
      totalLines: lines.length,
      foldedTokenEstimate: Math.ceil(folded.length / 4)
    };
  } finally {
    (0, import_node_fs2.rmSync)(tmpDir, { recursive: true, force: true });
  }
}
function parseFilesBatch(files, projectRoot) {
  const results = /* @__PURE__ */ new Map();
  const userConfig = projectRoot ? loadUserGrammars(projectRoot) : EMPTY_USER_GRAMMAR_CONFIG;
  const languageGroups = /* @__PURE__ */ new Map();
  for (const file of files) {
    const language = detectLanguageWithUserGrammars(file.relativePath, userConfig);
    if (!languageGroups.has(language)) languageGroups.set(language, []);
    languageGroups.get(language).push(file);
  }
  for (const [language, groupFiles] of languageGroups) {
    const grammarPath = resolveGrammarPathWithFallback(language, projectRoot);
    if (!grammarPath) {
      for (const file of groupFiles) {
        const lines = file.content.split("\n");
        results.set(file.relativePath, {
          filePath: file.relativePath,
          language,
          symbols: [],
          imports: [],
          totalLines: lines.length,
          foldedTokenEstimate: 50
        });
      }
      continue;
    }
    const queryKey = getUserAwareQueryKey(language, userConfig);
    const queryFile = getQueryFile(queryKey);
    const absolutePaths = groupFiles.map((f) => f.absolutePath);
    const batchResults = runBatchQuery(queryFile, absolutePaths, grammarPath);
    for (const file of groupFiles) {
      const lines = file.content.split("\n");
      const matches = batchResults.get(file.absolutePath) || [];
      const symbolResult = buildSymbols(matches, lines, language);
      const folded = formatFoldedView({
        filePath: file.relativePath,
        language,
        symbols: symbolResult.symbols,
        imports: symbolResult.imports,
        totalLines: lines.length,
        foldedTokenEstimate: 0
      });
      results.set(file.relativePath, {
        filePath: file.relativePath,
        language,
        symbols: symbolResult.symbols,
        imports: symbolResult.imports,
        totalLines: lines.length,
        foldedTokenEstimate: Math.ceil(folded.length / 4)
      });
    }
  }
  return results;
}
function formatFoldedView(file) {
  if (file.language === "markdown") {
    return formatMarkdownFoldedView(file);
  }
  const parts = [];
  parts.push(`\u{1F4C1} ${file.filePath} (${file.language}, ${file.totalLines} lines)`);
  parts.push("");
  if (file.imports.length > 0) {
    parts.push(`  \u{1F4E6} Imports: ${file.imports.length} statements`);
    for (const imp of file.imports.slice(0, 10)) {
      parts.push(`    ${imp}`);
    }
    if (file.imports.length > 10) {
      parts.push(`    ... +${file.imports.length - 10} more`);
    }
    parts.push("");
  }
  for (const sym of file.symbols) {
    parts.push(formatSymbol(sym, "  "));
  }
  return parts.join("\n");
}
function formatMarkdownFoldedView(file) {
  const parts = [];
  const COL_WIDTH = 56;
  parts.push(`\u{1F4C4} ${file.filePath} (${file.language}, ${file.totalLines} lines)`);
  for (const sym of file.symbols) {
    if (sym.kind === "section") {
      const hashMatch = sym.signature.match(/^(#{1,6})\s/);
      const level = hashMatch ? hashMatch[1].length : 1;
      const indent = "  ".repeat(level);
      const lineRange = `L${sym.lineStart + 1}`;
      const content = `${indent}${sym.signature}`;
      const anchor = anchorRange(sym);
      if (anchor) {
        parts.push(`${content.padEnd(COL_WIDTH)}${anchor}`);
      } else {
        parts.push(`${content.padEnd(COL_WIDTH)}${lineRange}`);
      }
    } else if (sym.kind === "code") {
      const containingLevel = findContainingHeadingLevel(file.symbols, sym.lineStart);
      const indent = "  ".repeat(containingLevel + 1);
      const lineRange = sym.lineStart === sym.lineEnd ? `L${sym.lineStart + 1}` : `L${sym.lineStart + 1}-${sym.lineEnd + 1}`;
      const content = `${indent}${sym.signature}`;
      const anchor = anchorRange(sym);
      if (anchor) {
        parts.push(`${content.padEnd(COL_WIDTH)}${anchor}`);
      } else {
        parts.push(`${content.padEnd(COL_WIDTH)}${lineRange}`);
      }
    } else if (sym.kind === "metadata") {
      const lineRange = sym.lineStart === sym.lineEnd ? `L${sym.lineStart + 1}` : `L${sym.lineStart + 1}-${sym.lineEnd + 1}`;
      const content = `  ${sym.signature}`;
      const anchor = anchorRange(sym);
      if (anchor) {
        parts.push(`${content.padEnd(COL_WIDTH)}${anchor}`);
      } else {
        parts.push(`${content.padEnd(COL_WIDTH)}${lineRange}`);
      }
    } else if (sym.kind === "reference") {
      const containingLevel = findContainingHeadingLevel(file.symbols, sym.lineStart);
      const indent = "  ".repeat(containingLevel + 1);
      const lineRange = `L${sym.lineStart + 1}`;
      const content = `${indent}\u2197 ${sym.name}`;
      const anchor = anchorRange(sym);
      if (anchor) {
        parts.push(`${content.padEnd(COL_WIDTH)}${anchor}`);
      } else {
        parts.push(`${content.padEnd(COL_WIDTH)}${lineRange}`);
      }
    }
  }
  return parts.join("\n");
}
function findContainingHeadingLevel(symbols, lineStart) {
  let bestLevel = 0;
  for (const sym of symbols) {
    if (sym.kind === "section" && sym.lineStart < lineStart) {
      const hashMatch = sym.signature.match(/^(#{1,6})\s/);
      bestLevel = hashMatch ? hashMatch[1].length : 1;
    }
  }
  return bestLevel;
}
function anchorRange(sym) {
  if (!sym.hashStart) return "";
  return sym.hashEnd && sym.hashEnd !== sym.hashStart ? `${sym.hashStart}-${sym.hashEnd}` : sym.hashStart;
}
function formatSymbol(sym, indent) {
  const parts = [];
  const icon = getSymbolIcon(sym.kind);
  const exportTag = sym.exported ? " [exported]" : "";
  const lineRange = sym.lineStart === sym.lineEnd ? `L${sym.lineStart + 1}` : `L${sym.lineStart + 1}-${sym.lineEnd + 1}`;
  const span = sym.lineEnd - sym.lineStart + 1;
  const showSpan = span > 100 && !!(sym.children && sym.children.length > 0);
  const anchor = anchorRange(sym);
  if (anchor) {
    parts.push(`${indent}${icon} ${sym.name}${exportTag} ${anchor}${showSpan ? ` (${span} lines)` : ""}`);
  } else {
    parts.push(`${indent}${icon} ${sym.name}${exportTag} (${lineRange}${showSpan ? `, ${span} lines` : ""})`);
  }
  parts.push(`${indent}  ${sym.signature}`);
  if (sym.jsdoc) {
    const jsdocLines = sym.jsdoc.split("\n");
    const firstLine = jsdocLines.find((l) => {
      const t = l.replace(/^[\s*/]+/, "").replace(/^['"`]{3}/, "").trim();
      return t.length > 0 && !t.startsWith("/**");
    });
    if (firstLine) {
      const cleaned = firstLine.replace(/^[\s*/]+/, "").replace(/^['"`]{3}/, "").replace(/['"`]{3}$/, "").trim();
      if (cleaned) {
        parts.push(`${indent}  \u{1F4AC} ${cleaned}`);
      }
    }
  }
  if (sym.children && sym.children.length > 0) {
    for (const child of sym.children) {
      parts.push(formatSymbol(child, indent + "  "));
    }
  }
  return parts.join("\n");
}
function getSymbolIcon(kind) {
  const icons = {
    function: "\u0192",
    method: "\u0192",
    class: "\u25C6",
    interface: "\u25C7",
    type: "\u25C7",
    const: "\u25CF",
    variable: "\u25CB",
    export: "\u2192",
    struct: "\u25C6",
    enum: "\u25A3",
    trait: "\u25C7",
    impl: "\u25C8",
    property: "\u25CB",
    getter: "\u21E2",
    setter: "\u21E0",
    mixin: "\u25C8",
    section: "\xA7",
    code: "\u2318",
    metadata: "\u25CA",
    reference: "\u2197"
  };
  return icons[kind] || "\xB7";
}
function unfoldSymbolFromFolded(content, filePath, file, symbolName) {
  const findSymbol = (symbols, name) => {
    for (const sym of symbols) {
      if (sym.name === name) return sym;
      if (sym.children) {
        const found = findSymbol(sym.children, name);
        if (found) return found;
      }
    }
    return null;
  };
  let symbol = null;
  if (symbolName.includes(".")) {
    const parts = symbolName.split(".");
    let currentSyms = file.symbols;
    let found = null;
    for (const part of parts) {
      found = findSymbol(currentSyms, part);
      if (!found) {
        found = null;
        break;
      }
      currentSyms = found.children ?? [];
    }
    if (found) symbol = found;
  }
  if (!symbol) {
    symbol = findSymbol(file.symbols, symbolName);
  }
  if (!symbol) return null;
  const lines = content.split("\n");
  if (file.language === "markdown" && symbol.kind === "section") {
    const hashMatch = symbol.signature.match(/^(#{1,6})\s/);
    const level = hashMatch ? hashMatch[1].length : 1;
    const start2 = symbol.lineStart;
    let end = lines.length - 1;
    for (const sym of file.symbols) {
      if (sym.kind === "section" && sym.lineStart > start2) {
        const otherHashMatch = sym.signature.match(/^(#{1,6})\s/);
        const otherLevel = otherHashMatch ? otherHashMatch[1].length : 1;
        if (otherLevel <= level) {
          end = sym.lineStart - 1;
          while (end > start2 && lines[end].trim() === "") end--;
          break;
        }
      }
    }
    const slice2 = lines.slice(start2, end + 1);
    if (isHashlineEditEnabled()) {
      const hashlined = slice2.map((ln, i) => formatHashLine(start2 + 1 + i, ln.replace(/\r$/, "")));
      return `<!-- \u{1F4CD} ${filePath} -->
${hashlined.join("\n")}`;
    }
    return `<!-- \u{1F4CD} ${filePath} L${start2 + 1}-${end + 1} -->
${slice2.join("\n")}`;
  }
  let start = symbol.lineStart;
  for (let i = symbol.lineStart - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === "" || trimmed.startsWith("*") || trimmed.startsWith("/**") || trimmed.startsWith("///") || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("@") || trimmed === "*/") {
      start = i;
    } else {
      break;
    }
  }
  const slice = lines.slice(start, symbol.lineEnd + 1);
  if (isHashlineEditEnabled()) {
    const hashlined = slice.map((ln, i) => formatHashLine(start + 1 + i, ln.replace(/\r$/, "")));
    return `// \u{1F4CD} ${filePath}
${hashlined.join("\n")}`;
  }
  return `// \u{1F4CD} ${filePath} L${start + 1}-${symbol.lineEnd + 1}
${slice.join("\n")}`;
}

// src/search.ts
function loadSearchPreviewMode() {
  const configPath = (0, import_node_path3.join)((0, import_node_os3.homedir)(), ".config", "opencode", "smart-explore-config.json");
  if (!(0, import_node_fs3.existsSync)(configPath)) return "lines";
  try {
    const raw = JSON.parse((0, import_node_fs3.readFileSync)(configPath, "utf-8"));
    return raw?.search_preview_mode === "signature" ? "signature" : "lines";
  } catch {
    return "lines";
  }
}
var CODE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".pyw",
  ".go",
  ".rs",
  ".rb",
  ".java",
  ".cs",
  ".cpp",
  ".cc",
  ".cxx",
  ".c",
  ".h",
  ".hpp",
  ".hh",
  ".swift",
  ".kt",
  ".kts",
  ".php",
  ".vue",
  ".svelte",
  ".ex",
  ".exs",
  ".lua",
  ".scala",
  ".sc",
  ".sh",
  ".bash",
  ".zsh",
  ".hs",
  ".zig",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".toml",
  ".yml",
  ".yaml",
  ".sql",
  ".md",
  ".mdx"
]);
var IGNORE_DIRS = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  ".env",
  "target",
  "vendor",
  ".cache",
  ".turbo",
  "coverage",
  ".nyc_output",
  ".claude",
  ".smart-file-read",
  ".smart-explore-mcp-cache"
]);
var IGNORE_FILES = /* @__PURE__ */ new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "Cargo.lock",
  "poetry.lock",
  "composer.lock",
  "Gemfile.lock",
  "go.sum",
  "flake.lock",
  "gradle.lockfile",
  "maven.lock"
]);
var MAX_FILE_SIZE = 512 * 1024;
async function* walkDir(dir, rootDir, maxDepth = 20, extraExtensions, excludedPaths = /* @__PURE__ */ new Set()) {
  if (maxDepth <= 0) return;
  let entries;
  try {
    entries = await (0, import_promises.readdir)(dir, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (IGNORE_FILES.has(entry.name)) continue;
    const fullPath = (0, import_node_path3.join)(dir, entry.name);
    if (entry.isDirectory()) {
      const relDirPath = normalizeRelativePath((0, import_node_path3.relative)(rootDir, fullPath));
      if (isExcludedPath(relDirPath, excludedPaths)) continue;
      yield* walkDir(fullPath, rootDir, maxDepth - 1, extraExtensions, excludedPaths);
    } else if (entry.isFile()) {
      const ext = entry.name.slice(entry.name.lastIndexOf("."));
      if (CODE_EXTENSIONS.has(ext) || extraExtensions && extraExtensions.has(ext)) {
        yield fullPath;
      }
    }
  }
}
function normalizeRelativePath(path) {
  const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  return normalized === "." ? "" : normalized;
}
function isExcludedPath(relPath, excludedPaths) {
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
async function safeReadFile(filePath) {
  try {
    const stats = await (0, import_promises.stat)(filePath);
    if (stats.size > MAX_FILE_SIZE) return null;
    if (stats.size === 0) return null;
    const content = await (0, import_promises.readFile)(filePath, "utf-8");
    if (content.slice(0, 1e3).includes("\0")) return null;
    return content;
  } catch {
    return null;
  }
}
async function collectSearchableFiles(rootDir, options = {}) {
  const projectRoot = options.projectRoot || rootDir;
  const userConfig = loadUserGrammars(projectRoot);
  const extraExtensions = /* @__PURE__ */ new Set();
  for (const entry of Object.values(userConfig.grammars)) {
    for (const ext of entry.extensions) {
      if (!CODE_EXTENSIONS.has(ext)) {
        extraExtensions.add(ext);
      }
    }
  }
  const excludedPaths = new Set(
    (options.excludePaths || []).map(normalizeRelativePath).filter((path) => path.length > 0)
  );
  const files = [];
  let truncated = false;
  for await (const filePath of walkDir(
    rootDir,
    rootDir,
    options.maxDepth || 20,
    extraExtensions.size > 0 ? extraExtensions : void 0,
    excludedPaths
  )) {
    const relativePath = normalizeRelativePath((0, import_node_path3.relative)(rootDir, filePath));
    if (options.filePattern) {
      if (!relativePath.toLowerCase().includes(options.filePattern.toLowerCase())) continue;
    }
    const content = await safeReadFile(filePath);
    if (!content) continue;
    files.push({
      absolutePath: filePath,
      relativePath,
      content
    });
    if (options.maxFiles && files.length >= options.maxFiles) {
      truncated = true;
      break;
    }
  }
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return { files, truncated };
}
var SYMBOL_ICONS = {
  function: "\u0192",
  method: "\u0192",
  class: "\u25C6",
  interface: "\u25C7",
  type: "\u25C7",
  const: "\u25CF",
  variable: "\u25CB",
  export: "\u2192",
  struct: "\u25C6",
  enum: "\u25A3",
  trait: "\u25C7",
  impl: "\u25C8",
  property: "\u25CB",
  getter: "\u21E2",
  setter: "\u21E0",
  mixin: "\u25C8",
  section: "\xA7",
  code: "\u2318",
  text: "\xB6",
  metadata: "\u25CA",
  reference: "\u2197"
};
function mergeSearchResults(queryResults) {
  const chunkMap = /* @__PURE__ */ new Map();
  for (let qi = 0; qi < queryResults.length; qi++) {
    for (const row of queryResults[qi]) {
      const key = `${row.file_path}:${row.line_start}:${row.line_end}`;
      const existing = chunkMap.get(key);
      if (existing) {
        if (!existing.queryIndices.includes(qi)) existing.queryIndices.push(qi);
        if (row._distance < existing.bestDistance) {
          existing.bestDistance = row._distance;
        }
      } else {
        chunkMap.set(key, { ...row, queryIndices: [qi], bestDistance: row._distance });
      }
    }
  }
  return [...chunkMap.values()].sort((a, b) => {
    if (b.queryIndices.length !== a.queryIndices.length)
      return b.queryIndices.length - a.queryIndices.length;
    return a.bestDistance - b.bestDistance;
  });
}
function formatMultiSearchResults(queries, rows, hasEmbedding, previewMode = "lines") {
  const parts = [];
  const mode = hasEmbedding ? "hybrid (vector + BM25)" : "BM25";
  const total = queries.length;
  const rawTotal = rows.reduce((s, r) => s + r.queryIndices.length, 0);
  parts.push(`\u{1F50D} Smart Search: ${total} queries \u2192 ${rows.length} unique results (${mode}, ${rawTotal} raw hits)`);
  queries.forEach((q, i) => parts.push(`   ${i + 1}: "${q}"`));
  parts.push("");
  if (rows.length === 0) {
    parts.push("   No matches found.");
    parts.push("");
    parts.push("   Try smart_index to rebuild the index, or smart_outline to browse files.");
    return parts.join("\n");
  }
  parts.push("\u2500\u2500 Results by File \u2500\u2500");
  parts.push("");
  const byFile = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const list = byFile.get(row.file_path) ?? [];
    list.push(row);
    byFile.set(row.file_path, list);
  }
  const sortedFiles = [...byFile.entries()].sort((a, b) => {
    const aQm = a[1].reduce((s, r) => s + r.queryIndices.length, 0);
    const bQm = b[1].reduce((s, r) => s + r.queryIndices.length, 0);
    if (bQm !== aQm) return bQm - aQm;
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return a[0].localeCompare(b[0]);
  });
  for (const [, fileRows] of sortedFiles) {
    fileRows.sort((a, b) => {
      if (b.queryIndices.length !== a.queryIndices.length)
        return b.queryIndices.length - a.queryIndices.length;
      return a.bestDistance - b.bestDistance;
    });
  }
  for (const [filePath, fileRows] of sortedFiles) {
    const lang = fileRows[0].language || "text";
    parts.push(`\u{1F4C1} ${filePath} (${lang}, ${fileRows.length} match${fileRows.length > 1 ? "es" : ""})`);
    for (const row of fileRows) {
      const icon = SYMBOL_ICONS[row.kind] || "\xB7";
      const range = row.line_start === row.line_end ? `L${row.line_start + 1}` : `L${row.line_start + 1}-L${row.line_end + 1}`;
      const anchor = row.hash_start || range;
      const name = row.symbol_name || "(text chunk)";
      const badge = `${row.queryIndices.length}/${total}`;
      const span = row.line_end - row.line_start + 1;
      const spanTag = span > 50 ? ` (${span} lines)` : "";
      parts.push(`  ${icon} ${name} ${anchor}${spanTag} [${badge}]`);
      if (previewMode === "signature" && row.signature) {
        parts.push(`    ${row.signature.slice(0, 200)}`);
      } else {
        const contentLines = row.content.split("\n").slice(0, 8);
        for (const line of contentLines) {
          const trimmed = line.replace(/\s+$/, "");
          if (trimmed.length > 0) parts.push(`    ${trimmed.slice(0, 120)}`);
        }
        if (row.content.split("\n").length > 8) {
          parts.push("    ...");
        }
      }
    }
    parts.push("");
  }
  parts.push("\u2500\u2500 Actions \u2500\u2500");
  parts.push("  To see full code: use smart_unfold with file_path and symbol_name");
  parts.push("  To see file structure: use smart_outline with file_path");
  parts.push("  To reindex: use smart_index");
  return parts.join("\n");
}
function formatSearchResults(query, rows, hasEmbedding, previewMode = "lines") {
  const parts = [];
  const mode = hasEmbedding ? "hybrid (vector + BM25)" : "BM25";
  parts.push(`\u{1F50D} Smart Search: "${query}"`);
  parts.push(`   ${rows.length} matches (${mode} search)`);
  parts.push("");
  if (rows.length === 0) {
    parts.push("   No matches found.");
    parts.push("");
    parts.push("   Try smart_index to rebuild the index, or smart_outline to browse files.");
    return parts.join("\n");
  }
  parts.push("\u2500\u2500 Results by File \u2500\u2500");
  parts.push("");
  const byFile = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const list = byFile.get(row.file_path) ?? [];
    list.push(row);
    byFile.set(row.file_path, list);
  }
  const sortedFiles = [...byFile.entries()].sort((a, b) => {
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return a[0].localeCompare(b[0]);
  });
  for (const [, fileRows] of sortedFiles) {
    fileRows.sort((a, b) => a.line_start - b.line_start);
  }
  for (const [filePath, fileRows] of sortedFiles) {
    const lang = fileRows[0].language || "text";
    parts.push(`\u{1F4C1} ${filePath} (${lang}, ${fileRows.length} match${fileRows.length > 1 ? "es" : ""})`);
    for (const row of fileRows) {
      const icon = SYMBOL_ICONS[row.kind] || "\xB7";
      const range = row.line_start === row.line_end ? `L${row.line_start + 1}` : `L${row.line_start + 1}-L${row.line_end + 1}`;
      const anchor = row.hash_start || range;
      const name = row.symbol_name || "(text chunk)";
      const span = row.line_end - row.line_start + 1;
      const spanTag = span > 50 ? ` (${span} lines)` : "";
      parts.push(`  ${icon} ${name} ${anchor}${spanTag}`);
      if (previewMode === "signature" && row.signature) {
        parts.push(`    ${row.signature.slice(0, 200)}`);
      } else {
        const contentLines = row.content.split("\n").slice(0, 8);
        for (const line of contentLines) {
          const trimmed = line.replace(/\s+$/, "");
          if (trimmed.length > 0) parts.push(`    ${trimmed.slice(0, 120)}`);
        }
        if (row.content.split("\n").length > 8) {
          parts.push("    ...");
        }
      }
    }
    parts.push("");
  }
  parts.push("\u2500\u2500 Actions \u2500\u2500");
  parts.push("  To see full code: use smart_unfold with file_path and symbol_name");
  parts.push("  To see file structure: use smart_outline with file_path");
  parts.push("  To reindex: use smart_index");
  return parts.join("\n");
}

// src/outline-cache.ts
var import_promises2 = require("node:fs/promises");
var import_node_crypto = require("node:crypto");
var import_node_path4 = require("node:path");
var outlineCache = /* @__PURE__ */ new Map();
var loadedCacheRoots = /* @__PURE__ */ new Set();
var MAX_CACHE_SIZE = 5e3;
var CACHE_DIR = ".smart-explore-mcp-cache";
var CACHE_FILE = "outline-cache.json";
async function getDirectoryOutline(dirPath, maxFiles) {
  return buildDirectoryOutline((0, import_node_path4.resolve)(dirPath), maxFiles, true);
}
async function getFileOutline(filePath) {
  const absolutePath = (0, import_node_path4.resolve)(filePath);
  const cacheRoot = await findCacheRoot(absolutePath);
  await loadDiskCache(cacheRoot);
  const stats = await (0, import_promises2.stat)(absolutePath);
  const content = await (0, import_promises2.readFile)(absolutePath, "utf-8");
  const cacheEntry = outlineCache.get(absolutePath);
  if (cacheEntry && cacheEntry.mtime === stats.mtimeMs && cacheEntry.size === stats.size) {
    return { content, foldedFile: cacheEntry.foldedFile, cached: true };
  }
  const relPath = normalizeRelativePath((0, import_node_path4.relative)(cacheRoot, absolutePath));
  const parsedResults = parseFilesBatch([{ absolutePath, relativePath: relPath, content }], cacheRoot);
  const foldedFile = parsedResults.get(relPath) ?? {
    filePath: relPath,
    language: "text",
    symbols: [],
    imports: [],
    totalLines: content.split("\n").length,
    foldedTokenEstimate: 0
  };
  evictIfNeeded();
  outlineCache.set(absolutePath, {
    cacheRoot,
    mtime: stats.mtimeMs,
    size: stats.size,
    foldedFile
  });
  await saveDiskCache(cacheRoot);
  return { content, foldedFile, cached: false };
}
async function buildDirectoryOutline(dirPath, maxFiles, includeOutlines) {
  const cacheRoot = await findCacheRoot(dirPath);
  await loadDiskCache(cacheRoot);
  const userConfig = loadUserGrammars(cacheRoot);
  const extraExtensions = /* @__PURE__ */ new Set();
  for (const entry of Object.values(userConfig.grammars)) {
    for (const ext of entry.extensions) {
      extraExtensions.add(ext);
    }
  }
  const filePaths = [];
  let truncated = false;
  for await (const filePath of walkDir(
    dirPath,
    cacheRoot,
    20,
    extraExtensions.size > 0 ? extraExtensions : void 0
  )) {
    filePaths.push(filePath);
    if (filePaths.length >= maxFiles) {
      truncated = true;
      break;
    }
  }
  filePaths.sort((a, b) => (0, import_node_path4.relative)(dirPath, a).localeCompare((0, import_node_path4.relative)(dirPath, b)));
  const foldedFiles = [];
  let skipped = 0;
  let cached = 0;
  let parsed = 0;
  const toParse = [];
  for (const absPath of filePaths) {
    let stats;
    try {
      stats = await (0, import_promises2.stat)(absPath);
    } catch {
      skipped++;
      continue;
    }
    const relPath = normalizeRelativePath((0, import_node_path4.relative)(cacheRoot, absPath));
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
      const content = await (0, import_promises2.readFile)(absPath, "utf-8");
      toParse.push({
        absolutePath: absPath,
        relativePath: relPath,
        content,
        mtime: stats.mtimeMs,
        size: stats.size
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
        content: f.content
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
        foldedFile
      });
      foldedFiles.push({ absolutePath: file.absolutePath, foldedFile });
      parsed++;
    }
    await saveDiskCache(cacheRoot);
  }
  foldedFiles.sort((a, b) => a.foldedFile.filePath.localeCompare(b.foldedFile.filePath));
  const outlines = includeOutlines ? foldedFiles.map(
    ({ absolutePath, foldedFile }) => formatFoldedView(rebaseFoldedFile(foldedFile, dirPath, absolutePath))
  ) : [];
  return { outlines, truncated, skipped, cached, parsed };
}
async function findCacheRoot(startPath) {
  let current = startPath;
  try {
    const stats = await (0, import_promises2.stat)(current);
    if (!stats.isDirectory()) current = (0, import_node_path4.dirname)(current);
  } catch {
    current = (0, import_node_path4.dirname)(current);
  }
  const fallbackRoot = current;
  while (true) {
    try {
      await (0, import_promises2.stat)((0, import_node_path4.join)(current, ".git"));
      return current;
    } catch {
      const parent = (0, import_node_path4.dirname)(current);
      if (parent === current) return fallbackRoot;
      current = parent;
    }
  }
}
async function loadDiskCache(cacheRoot) {
  if (loadedCacheRoots.has(cacheRoot)) return;
  loadedCacheRoots.add(cacheRoot);
  try {
    const raw = await (0, import_promises2.readFile)(cachePath(cacheRoot), "utf-8");
    const data = JSON.parse(raw);
    if (data.version !== 1 || !data.entries) return;
    for (const [relPath, entry] of Object.entries(data.entries)) {
      const absolutePath = (0, import_node_path4.join)(cacheRoot, relPath);
      outlineCache.set(absolutePath, {
        cacheRoot,
        mtime: entry.mtime,
        size: entry.size,
        foldedFile: entry.foldedFile
      });
    }
  } catch {
  }
}
async function saveDiskCache(cacheRoot) {
  const entries = {};
  for (const [absolutePath, entry] of outlineCache) {
    if (entry.cacheRoot !== cacheRoot) continue;
    const relPath = normalizeRelativePath((0, import_node_path4.relative)(cacheRoot, absolutePath));
    entries[relPath] = {
      mtime: entry.mtime,
      size: entry.size,
      foldedFile: entry.foldedFile
    };
  }
  const dir = (0, import_node_path4.join)(cacheRoot, CACHE_DIR);
  await (0, import_promises2.mkdir)(dir, { recursive: true });
  const target = (0, import_node_path4.join)(dir, CACHE_FILE);
  const temp = `${target}.${(0, import_node_crypto.randomUUID)()}.tmp`;
  await (0, import_promises2.writeFile)(temp, JSON.stringify({ version: 1, entries }));
  await (0, import_promises2.rename)(temp, target);
}
function cachePath(cacheRoot) {
  return (0, import_node_path4.join)(cacheRoot, CACHE_DIR, CACHE_FILE);
}
function rebaseFoldedFile(foldedFile, displayRoot, absolutePath) {
  return {
    ...foldedFile,
    filePath: normalizeRelativePath((0, import_node_path4.relative)(displayRoot, absolutePath))
  };
}
function evictIfNeeded() {
  if (outlineCache.size < MAX_CACHE_SIZE) return;
  const firstKey = outlineCache.keys().next().value;
  if (firstKey) outlineCache.delete(firstKey);
}

// src/relations.ts
var import_promises3 = require("node:fs/promises");
var import_node_path5 = require("node:path");
var import_node_fs4 = require("node:fs");
var CODE_EXTENSIONS2 = /* @__PURE__ */ new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".pyw",
  ".go",
  ".rs",
  ".rb",
  ".java",
  ".cpp",
  ".cc",
  ".cxx",
  ".c",
  ".h",
  ".hpp",
  ".hh",
  ".swift",
  ".kt",
  ".kts",
  ".php",
  ".ex",
  ".exs",
  ".lua",
  ".scala",
  ".sc",
  ".sh",
  ".bash",
  ".zsh",
  ".hs",
  ".zig",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".toml",
  ".yml",
  ".yaml",
  ".sql",
  ".md",
  ".mdx"
]);
var IGNORE_DIRS2 = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  ".env",
  "target",
  "vendor",
  ".cache",
  ".turbo",
  "coverage",
  ".nyc_output",
  ".claude",
  ".smart-file-read"
]);
var MAX_FILE_SIZE2 = 512 * 1024;
var CALL_IGNORE = /* @__PURE__ */ new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "return",
  "typeof",
  "sizeof",
  "new",
  "function",
  "class",
  "import",
  "export",
  "await",
  "yield",
  "throw",
  "else",
  "map",
  "filter",
  "reduce",
  "forEach",
  "find",
  "some",
  "every",
  "includes",
  "slice",
  "split",
  "join",
  "push",
  "pop",
  "shift",
  "unshift",
  "toLowerCase",
  "toUpperCase",
  "trim",
  "trimStart",
  "trimEnd",
  "replace",
  "match",
  "test",
  "sort",
  "set",
  "get",
  "has",
  "values",
  "keys",
  "entries",
  "resolve",
  "reject"
]);
async function* walkDir2(dir, maxDepth = 20) {
  if (maxDepth <= 0) return;
  let entries;
  try {
    entries = await (0, import_promises3.readdir)(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    if (IGNORE_DIRS2.has(entry.name)) continue;
    const fullPath = (0, import_node_path5.join)(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir2(fullPath, maxDepth - 1);
    } else if (entry.isFile() && CODE_EXTENSIONS2.has((0, import_node_path5.extname)(entry.name))) {
      yield fullPath;
    }
  }
}
async function safeReadFile2(filePath) {
  try {
    const stats = await (0, import_promises3.stat)(filePath);
    if (stats.size === 0 || stats.size > MAX_FILE_SIZE2) return null;
    const content = await (0, import_promises3.readFile)(filePath, "utf-8");
    if (content.slice(0, 1e3).includes("\0")) return null;
    return content;
  } catch {
    return null;
  }
}
async function collectProject(rootDir, filePattern, pathPrefix) {
  const files = [];
  const normalizedPrefix = pathPrefix ? pathPrefix.replace(/^\.\//, "").replace(/\/$/, "") : null;
  for await (const absolutePath of walkDir2(rootDir)) {
    const relativePath = (0, import_node_path5.relative)(rootDir, absolutePath);
    if (normalizedPrefix && !relativePath.startsWith(normalizedPrefix)) continue;
    if (filePattern && !relativePath.toLowerCase().includes(filePattern.toLowerCase())) continue;
    const content = await safeReadFile2(absolutePath);
    if (!content) continue;
    files.push({ absolutePath, relativePath, content });
  }
  const parsed = parseFilesBatch(files, rootDir);
  const symbols = flattenProjectSymbols(parsed);
  const symbolByName = /* @__PURE__ */ new Map();
  for (const symbol of symbols) {
    if (!symbolByName.has(symbol.name)) symbolByName.set(symbol.name, symbol);
  }
  const calls = [];
  for (const file of files) {
    const folded = parsed.get(file.relativePath);
    if (!folded) continue;
    calls.push(...extractCalls(file.relativePath, file.content, folded.symbols, symbolByName));
  }
  return { rootDir, files, parsed, symbols, calls };
}
function flattenProjectSymbols(parsed) {
  const result = [];
  for (const file of parsed.values()) {
    const visit = (symbols, parent) => {
      for (const sym of symbols) {
        const qualified = parent ? `${parent}.${sym.name}` : sym.name;
        result.push({
          name: qualified,
          filePath: file.filePath,
          lineStart: sym.lineStart,
          lineEnd: sym.lineEnd,
          signature: sym.signature
        });
        if (sym.children) visit(sym.children, qualified);
      }
    };
    visit(file.symbols);
  }
  return result;
}
function extractCalls(filePath, content, symbols, symbolByName) {
  const flatSymbols = [];
  const visit = (items, parent) => {
    for (const item of items) {
      const name = parent ? `${parent}.${item.name}` : item.name;
      flatSymbols.push({ name, filePath, lineStart: item.lineStart, lineEnd: item.lineEnd, signature: item.signature });
      if (item.children) visit(item.children, name);
    }
  };
  visit(symbols);
  const lines = content.split("\n");
  const edges = [];
  const callRegex = /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*\(/g;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = stripLineComment(lines[lineIndex]);
    let match;
    while (match = callRegex.exec(line)) {
      const callText = match[1];
      const callee = callText.split(".").pop() || callText;
      if (CALL_IGNORE.has(callee) || CALL_IGNORE.has(callText)) continue;
      if (looksLikeDefinition(line, match.index)) continue;
      const caller = findEnclosingSymbol(flatSymbols, lineIndex);
      if (!caller) continue;
      if (caller.name === callee || caller.name.endsWith(`.${callee}`)) continue;
      const target = symbolByName.get(callee) || [...symbolByName.values()].find((s) => s.name.endsWith(`.${callee}`));
      edges.push({
        caller: caller.name,
        callerFile: filePath,
        callerLine: caller.lineStart + 1,
        callee,
        calleeFile: target?.filePath,
        calleeLine: target ? target.lineStart + 1 : void 0,
        callText,
        line: lineIndex + 1
      });
    }
  }
  return edges;
}
function stripLineComment(line) {
  return line.replace(/\/\/.*$/, "").replace(/#.*$/, "");
}
function looksLikeDefinition(line, callIndex) {
  const before = line.slice(0, callIndex);
  return /\b(function|def|func|fn)\s+$/.test(before) || /=>\s*$/.test(line);
}
function findEnclosingSymbol(symbols, lineIndex) {
  let best = null;
  for (const sym of symbols) {
    if (lineIndex >= sym.lineStart && lineIndex <= sym.lineEnd) {
      if (!best || sym.lineEnd - sym.lineStart < best.lineEnd - best.lineStart) best = sym;
    }
  }
  return best;
}
async function findCallers(rootDir, symbolName, options = {}) {
  const project = await collectProject(rootDir, options.filePattern, options.pathPrefix);
  const matches = project.calls.filter((edge) => edge.callee === symbolName || edge.callText === symbolName || edge.callText.endsWith(`.${symbolName}`));
  return formatCallEdges("Incoming Call Edges", symbolName, matches.slice(0, options.maxResults || 40), project.calls.length);
}
async function findCallees(rootDir, symbolName, options = {}) {
  const project = await collectProject(rootDir, options.filePattern, options.pathPrefix);
  const matches = project.calls.filter((edge) => edge.caller === symbolName || edge.caller.endsWith(`.${symbolName}`));
  matches.sort((a, b) => Number(Boolean(b.calleeFile)) - Number(Boolean(a.calleeFile)));
  return formatCallEdges("Outgoing Call Edges", symbolName, matches.slice(0, options.maxResults || 40), project.calls.length);
}
function formatCallEdges(title, symbolName, edges, totalEdges) {
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
async function relatedFiles(rootDir, filePath, options = {}) {
  const absoluteTarget = (0, import_node_path5.resolve)(rootDir, filePath);
  const targetRel = (0, import_node_path5.relative)(rootDir, absoluteTarget);
  const project = await collectProject(rootDir);
  const importsByFile = /* @__PURE__ */ new Map();
  const normalizedPrefix = options.pathPrefix ? options.pathPrefix.replace(/^\.\//, "").replace(/\/$/, "") : null;
  const matchesPrefix = (p) => !normalizedPrefix || p.startsWith(normalizedPrefix);
  for (const file of project.files) {
    importsByFile.set(file.relativePath, extractImportSpecifiers(file.content));
  }
  const outgoing = (importsByFile.get(targetRel) || []).map((spec) => resolveImport(rootDir, targetRel, spec)).filter((item) => Boolean(item)).filter(matchesPrefix);
  const incoming = [];
  for (const [sourceFile, specs] of importsByFile) {
    if (sourceFile === targetRel) continue;
    if (!matchesPrefix(sourceFile)) continue;
    if (specs.some((spec) => resolveImport(rootDir, sourceFile, spec) === targetRel)) incoming.push(sourceFile);
  }
  const tests = findLikelyTests(project.files.map((f) => f.relativePath), targetRel).filter(matchesPrefix);
  return formatRelatedFiles(targetRel, outgoing, incoming, tests, options.maxResults || 40);
}
function extractImportSpecifiers(content) {
  const specs = /* @__PURE__ */ new Set();
  const patterns = [
    /\bimport\s+(?:[^'";]+\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+[^'";]+\s+from\s+["']([^"']+)["']/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g
  ];
  for (const pattern of patterns) {
    let match;
    while (match = pattern.exec(content)) specs.add(match[1]);
  }
  return [...specs];
}
function resolveImport(rootDir, sourceRel, spec) {
  if (!spec.startsWith(".")) return null;
  const base = (0, import_node_path5.resolve)(rootDir, (0, import_node_path5.dirname)(sourceRel), spec);
  const candidates = [
    base,
    ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].map((ext) => base + ext),
    ...sourceEquivalentCandidates(base),
    ...["index.ts", "index.tsx", "index.js", "index.jsx"].map((name) => (0, import_node_path5.join)(base, name))
  ];
  const found = candidates.find((candidate) => (0, import_node_fs4.existsSync)(candidate));
  return found ? (0, import_node_path5.relative)(rootDir, found) : null;
}
function sourceEquivalentCandidates(base) {
  if (base.endsWith(".js")) return [base.slice(0, -3) + ".ts", base.slice(0, -3) + ".tsx"];
  if (base.endsWith(".jsx")) return [base.slice(0, -4) + ".tsx"];
  if (base.endsWith(".mjs") || base.endsWith(".cjs")) return [base.slice(0, -4) + ".ts"];
  return [];
}
function findLikelyTests(allFiles, targetRel) {
  const base = targetRel.replace(/\.[^.]+$/, "").split("/").pop() || targetRel;
  return allFiles.filter((file) => {
    const lower = file.toLowerCase();
    return lower.includes(base.toLowerCase()) && /(?:test|spec|__tests__)/.test(lower) && file !== targetRel;
  });
}
function formatRelatedFiles(targetRel, outgoing, incoming, tests, maxResults) {
  const parts = [`Related Files: ${targetRel}`, ""];
  parts.push("Outgoing imports:");
  parts.push(...formatFileList(outgoing, maxResults));
  parts.push("", "Incoming imports:");
  parts.push(...formatFileList(incoming, maxResults));
  parts.push("", "Likely tests:");
  parts.push(...formatFileList(tests, maxResults));
  return parts.join("\n");
}
function formatFileList(files, maxResults) {
  if (files.length === 0) return ["- none found"];
  const shown = files.slice(0, maxResults).map((file) => `- ${file}`);
  if (files.length > maxResults) shown.push(`- ... +${files.length - maxResults} more`);
  return shown;
}

// src/index-store.ts
var import_lancedb = __toESM(require("@lancedb/lancedb"), 1);
var import_node_path7 = require("node:path");
var import_node_fs6 = require("node:fs");
var import_node_crypto2 = require("node:crypto");

// src/embed.ts
var import_embedding = require("@lancedb/lancedb/embedding");
var import_apache_arrow = require("apache-arrow");

// src/config.ts
var import_node_fs5 = require("node:fs");
var import_node_path6 = require("node:path");
var import_node_os4 = require("node:os");
var DEFAULT_QUERY_PROMPT = "Instruct: Given a coding question, retrieve relevant code or docs.\nQuery: ";
var DEFAULT_MAX_BATCH_SIZE = 64;
var DEFAULT_MAX_CONCURRENCY = 4;
var configCache = /* @__PURE__ */ new Map();
function resolveUserConfigPath() {
  const xdg = process.env.XDG_CONFIG_HOME?.trim() || (0, import_node_path6.join)((0, import_node_os4.homedir)(), ".config");
  return (0, import_node_path6.join)(xdg, "opencode", "smart-explore-config.json");
}
function validateConfig(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const root = raw;
  const emb = root.embedding;
  if (!emb || typeof emb !== "object" || Array.isArray(emb)) return null;
  const e = emb;
  if (typeof e.baseUrl !== "string" || !e.baseUrl.trim()) return null;
  if (typeof e.model !== "string" || !e.model.trim()) return null;
  if (typeof e.dim !== "number" || !Number.isInteger(e.dim) || e.dim <= 0) return null;
  return {
    baseUrl: e.baseUrl.trim(),
    model: e.model.trim(),
    dim: e.dim,
    queryPrompt: typeof e.queryPrompt === "string" ? e.queryPrompt : DEFAULT_QUERY_PROMPT,
    maxBatchSize: typeof e.maxBatchSize === "number" && e.maxBatchSize > 0 ? e.maxBatchSize : DEFAULT_MAX_BATCH_SIZE,
    maxConcurrency: typeof e.maxConcurrency === "number" && e.maxConcurrency > 0 ? e.maxConcurrency : DEFAULT_MAX_CONCURRENCY
  };
}
function loadEmbeddingConfig(projectRoot) {
  const cacheKey = projectRoot || "<global>";
  if (configCache.has(cacheKey)) return configCache.get(cacheKey);
  if (projectRoot) {
    const projectConfigPath = (0, import_node_path6.join)(projectRoot, ".smart-explore.json");
    if ((0, import_node_fs5.existsSync)(projectConfigPath)) {
      try {
        const raw = JSON.parse((0, import_node_fs5.readFileSync)(projectConfigPath, "utf-8"));
        const config = validateConfig(raw);
        if (config) {
          configCache.set(cacheKey, config);
          return config;
        }
      } catch {
      }
    }
  }
  const userConfigPath = resolveUserConfigPath();
  if ((0, import_node_fs5.existsSync)(userConfigPath)) {
    try {
      const raw = JSON.parse((0, import_node_fs5.readFileSync)(userConfigPath, "utf-8"));
      const config = validateConfig(raw);
      if (config) {
        configCache.set(cacheKey, config);
        return config;
      }
    } catch {
    }
  }
  configCache.set(cacheKey, null);
  return null;
}

// src/embed.ts
var DEFAULT_QUERY_PROMPT2 = "Instruct: Given a coding question, retrieve relevant code or docs.\nQuery: ";
var DEFAULT_MAX_BATCH_SIZE2 = 64;
var DEFAULT_MAX_CONCURRENCY2 = 4;
var embeddingProgressHandler = null;
var F2LLMEmbeddingFunction = class extends import_embedding.TextEmbeddingFunction {
  #baseUrl;
  #model;
  #dim;
  #queryPrompt;
  #maxBatchSize;
  #maxConcurrency;
  constructor(optionsRaw) {
    super();
    const options = this.resolveVariables(optionsRaw ?? {});
    this.#baseUrl = options.baseUrl ?? "";
    this.#model = options.model ?? "";
    this.#dim = options.dim ?? 0;
    this.#queryPrompt = options.queryPrompt ?? DEFAULT_QUERY_PROMPT2;
    this.#maxBatchSize = options.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE2;
    this.#maxConcurrency = options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY2;
  }
  ndims() {
    return this.#dim;
  }
  embeddingDataType() {
    return new import_apache_arrow.Float32();
  }
  async #embedBatch(texts, mode) {
    if (texts.length === 0) return [];
    const inputs = mode === "query" ? texts.map((t) => this.#queryPrompt + t) : texts;
    const batchSize = mode === "doc" && embeddingProgressHandler ? Math.min(this.#maxBatchSize, 8) : this.#maxBatchSize;
    const batches = [];
    const allResults = new Array(inputs.length);
    for (let i = 0; i < inputs.length; i += batchSize) {
      batches.push({ offset: i, texts: inputs.slice(i, i + batchSize) });
    }
    let nextBatch = 0;
    const workers = Array.from({ length: Math.min(this.#maxConcurrency, batches.length) }, async () => {
      while (nextBatch < batches.length) {
        const batch = batches[nextBatch++];
        const resp = await fetch(`${this.#baseUrl}/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: this.#model, input: batch.texts })
        });
        if (!resp.ok) {
          const body = await resp.text().catch(() => "");
          throw new Error(`Embedding HTTP ${resp.status}: ${body}`);
        }
        const data = await resp.json();
        for (const d of data.data) allResults[batch.offset + d.index] = d.embedding;
        if (mode === "doc") embeddingProgressHandler?.(batch.texts.length);
      }
    });
    await Promise.all(workers);
    return allResults;
  }
  async generateEmbeddings(texts) {
    return this.#embedBatch(texts, "doc");
  }
  async computeSourceEmbeddings(data) {
    return this.#embedBatch(data, "doc");
  }
  async computeQueryEmbeddings(data) {
    const [vec] = await this.#embedBatch([data], "query");
    return vec;
  }
};
var registered = false;
function ensureRegistered() {
  if (registered) return;
  try {
    (0, import_embedding.getRegistry)().register("f2llm")(F2LLMEmbeddingFunction);
  } catch {
  }
  registered = true;
}
var cachedFunction;
function getEmbeddingFunction(projectRoot) {
  ensureRegistered();
  if (cachedFunction !== void 0) return cachedFunction;
  const config = loadEmbeddingConfig(projectRoot);
  if (!config) {
    cachedFunction = null;
    return null;
  }
  cachedFunction = new F2LLMEmbeddingFunction(config);
  return cachedFunction;
}
function setEmbeddingProgressHandler(handler) {
  embeddingProgressHandler = handler;
}

// src/index-store.ts
var { connect, Index, rerankers } = import_lancedb.default;
var TABLE_NAME = "chunks";
var INDEX_DIR_NAME = ".smart-explore-mcp-cache";
var FTS_COLUMNS = ["content", "symbol_name", "signature"];
function escapeSqlString(s) {
  return s.replace(/'/g, "''");
}
function hashContent(content) {
  return (0, import_node_crypto2.createHash)("sha256").update(content).digest("hex").slice(0, 16);
}
var IndexStore = class _IndexStore {
  #projectRoot;
  #indexDir;
  #db;
  #table;
  #hasEmbedding;
  #rrf;
  constructor(projectRoot, indexDir, db, table, hasEmbedding, rrf) {
    this.#projectRoot = projectRoot;
    this.#indexDir = indexDir;
    this.#db = db;
    this.#table = table;
    this.#hasEmbedding = hasEmbedding;
    this.#rrf = rrf;
  }
  static getIndexDir(projectRoot) {
    return (0, import_node_path7.join)(projectRoot, INDEX_DIR_NAME);
  }
  static indexExists(projectRoot) {
    return (0, import_node_fs6.existsSync)((0, import_node_path7.join)(projectRoot, INDEX_DIR_NAME, "lancedb"));
  }
  static async open(projectRoot) {
    getEmbeddingFunction(projectRoot);
    const indexDir = (0, import_node_path7.join)(projectRoot, INDEX_DIR_NAME);
    const dbDir = (0, import_node_path7.join)(indexDir, "lancedb");
    if (!(0, import_node_fs6.existsSync)(indexDir)) (0, import_node_fs6.mkdirSync)(indexDir, { recursive: true });
    const db = await connect(dbDir);
    const tableNames = await db.tableNames();
    let table;
    let hasEmbedding;
    if (tableNames.includes(TABLE_NAME)) {
      table = await db.openTable(TABLE_NAME);
      const schema = await table.schema();
      hasEmbedding = schema.metadata?.has("embedding_functions") ?? false;
      await _IndexStore.ensureFtsIndices(table);
    } else {
      const embedFn = getEmbeddingFunction(projectRoot);
      hasEmbedding = embedFn !== null;
      const placeholder = [
        {
          content: "",
          file_path: "",
          symbol_name: "",
          kind: "",
          signature: "",
          line_start: 0,
          line_end: 0,
          hash_start: "",
          language: "",
          content_hash: "",
          file_mtime: 0
        }
      ];
      if (hasEmbedding) {
        table = await db.createTable(TABLE_NAME, placeholder, {
          mode: "overwrite",
          embeddingFunction: {
            sourceColumn: "content",
            vectorColumn: "vector",
            function: embedFn
          }
        });
      } else {
        table = await db.createTable(TABLE_NAME, placeholder, {
          mode: "overwrite"
        });
      }
      await table.delete("content = ''");
      await _IndexStore.createFtsIndices(table);
    }
    let rrf = null;
    if (hasEmbedding) {
      try {
        rrf = await rerankers.RRFReranker.create();
      } catch {
        rrf = null;
      }
    }
    return new _IndexStore(projectRoot, indexDir, db, table, hasEmbedding, rrf);
  }
  static async destroy(projectRoot) {
    const indexDir = (0, import_node_path7.join)(projectRoot, INDEX_DIR_NAME);
    (0, import_node_fs6.rmSync)(indexDir, { recursive: true, force: true });
  }
  static async createFtsIndices(table) {
    for (const col of FTS_COLUMNS) {
      await table.createIndex(col, { config: Index.fts() });
    }
  }
  static async ensureFtsIndices(table) {
    const existing = await table.listIndices();
    const indexedCols = new Set(existing.map((i) => i.columns?.[0]).filter(Boolean));
    for (const col of FTS_COLUMNS) {
      if (!indexedCols.has(col)) {
        await table.createIndex(col, { config: Index.fts() });
      }
    }
  }
  get hasEmbedding() {
    return this.#hasEmbedding;
  }
  async upsertChunks(filePath, mtime, chunks) {
    await this.upsertChunkFiles([{ filePath, mtime, chunks }]);
  }
  async upsertChunkFiles(files, options) {
    const maxRowsPerBatch = options?.maxRowsPerBatch ?? 512;
    let rows = [];
    let batchFiles = 0;
    let batchChunks = 0;
    const flush = async () => {
      if (rows.length === 0) return;
      await this.#table.add(rows);
      options?.onBatch?.(batchFiles, batchChunks);
      rows = [];
      batchFiles = 0;
      batchChunks = 0;
    };
    for (const file of files) {
      const escaped = escapeSqlString(file.filePath);
      await this.#table.delete(`file_path = '${escaped}'`);
      batchFiles++;
      batchChunks += file.chunks.length;
      for (const c of file.chunks) {
        rows.push({
          content: c.content,
          file_path: file.filePath,
          symbol_name: c.symbolName,
          kind: c.kind,
          signature: c.signature,
          line_start: c.lineStart,
          line_end: c.lineEnd,
          hash_start: c.hashStart ?? "",
          language: c.language,
          content_hash: hashContent(c.content),
          file_mtime: file.mtime
        });
      }
      if (rows.length >= maxRowsPerBatch) await flush();
    }
    await flush();
    if (batchFiles > 0) options?.onBatch?.(batchFiles, batchChunks);
  }
  async deleteFile(filePath) {
    const escaped = escapeSqlString(filePath);
    await this.#table.delete(`file_path = '${escaped}'`);
  }
  async search(query, filePattern, limit, pathPrefix) {
    const overfetch = Math.min(limit * 3, 100);
    let q;
    if (this.#hasEmbedding) {
      q = this.#table.search(query).limit(overfetch);
    } else {
      q = this.#table.search(query, "fts").limit(overfetch);
    }
    const conditions = [];
    if (filePattern) {
      const likePattern = filePattern.replace(/\*/g, "%");
      conditions.push(`file_path LIKE '%${escapeSqlString(likePattern)}%'`);
    }
    if (pathPrefix) {
      const normalized = pathPrefix.replace(/^\.\//, "").replace(/\/$/, "");
      conditions.push(`file_path LIKE '${escapeSqlString(normalized)}%'`);
    }
    if (conditions.length > 0) {
      q = q.where(conditions.join(" AND "));
    }
    if (this.#hasEmbedding && this.#rrf) {
      q = q.rerank(this.#rrf);
    }
    const results = await q.toArray();
    return results.slice(0, limit).map((r) => ({
      content: r.content,
      file_path: r.file_path,
      symbol_name: r.symbol_name,
      kind: r.kind,
      signature: r.signature,
      line_start: r.line_start,
      line_end: r.line_end,
      hash_start: r.hash_start,
      language: r.language,
      _distance: r._distance ?? 0
    }));
  }
  async countRows() {
    return this.#table.countRows();
  }
  async getIndexedFiles() {
    const results = await this.#table.query().select(["file_path", "file_mtime"]).toArray();
    const fileMtimes = /* @__PURE__ */ new Map();
    for (const r of results) {
      const current = fileMtimes.get(r.file_path) ?? 0;
      if (r.file_mtime > current) {
        fileMtimes.set(r.file_path, r.file_mtime);
      }
    }
    return fileMtimes;
  }
  async close() {
    try {
      this.#table.close();
    } catch {
    }
  }
};

// src/indexer.ts
var import_node_fs8 = require("node:fs");
var import_node_child_process2 = require("node:child_process");

// src/chunker.ts
var CONTAINER_KINDS2 = /* @__PURE__ */ new Set(["class", "struct", "impl", "trait", "interface", "enum", "mixin"]);
var CHUNK_SIZE = 1e3;
var CHUNK_OVERLAP = 200;
function chunkFromParsed(content, parsed) {
  if (parsed.language === "markdown") {
    return chunkMarkdown(content, parsed);
  }
  if (parsed.symbols.length === 0) {
    return chunkByChars(content, parsed.language);
  }
  return chunkCode(content, parsed, parsed.language);
}
function chunkCode(content, parsed, language) {
  const chunks = [];
  const lines = content.split("\n");
  const processSymbol = (sym, parent) => {
    const fullName = parent ? `${parent}.${sym.name}` : sym.name;
    if (CONTAINER_KINDS2.has(sym.kind)) {
      const classFolded = {
        filePath: parsed.filePath,
        language,
        symbols: [sym],
        imports: [],
        totalLines: sym.lineEnd - sym.lineStart + 1,
        foldedTokenEstimate: 0
      };
      chunks.push({
        content: formatFoldedView(classFolded),
        symbolName: fullName,
        kind: sym.kind,
        signature: sym.signature,
        lineStart: sym.lineStart,
        lineEnd: sym.lineEnd,
        hashStart: sym.hashStart,
        language
      });
      if (sym.children) {
        for (const child of sym.children) {
          processSymbol(child, fullName);
        }
      }
    } else {
      const body = lines.slice(sym.lineStart, sym.lineEnd + 1).join("\n");
      if (body.trim().length > 0) {
        chunks.push({
          content: body,
          symbolName: fullName,
          kind: sym.kind,
          signature: sym.signature,
          lineStart: sym.lineStart,
          lineEnd: sym.lineEnd,
          hashStart: sym.hashStart,
          language
        });
      }
      if (sym.children) {
        for (const child of sym.children) {
          processSymbol(child, fullName);
        }
      }
    }
  };
  for (const sym of parsed.symbols) {
    processSymbol(sym);
  }
  return chunks;
}
function chunkMarkdown(content, parsed) {
  if (parsed.symbols.length === 0) {
    return chunkByChars(content, "markdown");
  }
  const chunks = [];
  const lines = content.split("\n");
  const sections = parsed.symbols.filter((s) => s.kind === "section");
  for (const sym of sections) {
    const hashMatch = sym.signature.match(/^(#{1,6})\s/);
    const level = hashMatch ? hashMatch[1].length : 1;
    let end = lines.length - 1;
    for (const other of sections) {
      if (other.lineStart > sym.lineStart) {
        const otherHashMatch = other.signature.match(/^(#{1,6})\s/);
        const otherLevel = otherHashMatch ? otherHashMatch[1].length : 1;
        if (otherLevel <= level) {
          end = other.lineStart - 1;
          while (end > sym.lineStart && lines[end].trim() === "") end--;
          break;
        }
      }
    }
    const sectionContent = lines.slice(sym.lineStart, end + 1).join("\n");
    if (sectionContent.trim().length > 0) {
      chunks.push({
        content: sectionContent,
        symbolName: sym.name,
        kind: "section",
        signature: sym.signature,
        lineStart: sym.lineStart,
        lineEnd: end,
        hashStart: sym.hashStart,
        language: "markdown"
      });
    }
  }
  return chunks.length > 0 ? chunks : chunkByChars(content, "markdown");
}
function chunkByChars(content, language) {
  const lines = content.split("\n");
  if (content.trim().length === 0) return [];
  if (content.length <= CHUNK_SIZE) {
    return [
      {
        content,
        symbolName: "",
        kind: "text",
        signature: "",
        lineStart: 0,
        lineEnd: lines.length - 1,
        language
      }
    ];
  }
  const breakPoints = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "") breakPoints.push(i);
  }
  const chunks = [];
  let startLine = 0;
  while (startLine < lines.length) {
    let charCount = 0;
    let endLine = startLine;
    while (endLine < lines.length && charCount < CHUNK_SIZE) {
      charCount += lines[endLine].length + 1;
      endLine++;
    }
    if (endLine < lines.length) {
      let bestBreak = -1;
      for (const bp of breakPoints) {
        if (bp >= startLine && bp < endLine) bestBreak = bp;
      }
      if (bestBreak >= 0 && bestBreak > startLine) {
        endLine = bestBreak + 1;
      }
    }
    let overlapStart = startLine;
    if (startLine > 0) {
      let overlapChars = 0;
      let back = startLine - 1;
      while (back >= 0 && overlapChars < CHUNK_OVERLAP) {
        overlapChars += lines[back].length + 1;
        back--;
      }
      overlapStart = back + 1;
    }
    const chunkContent = lines.slice(overlapStart, endLine).join("\n");
    if (chunkContent.trim().length > 0) {
      chunks.push({
        content: chunkContent,
        symbolName: "",
        kind: "text",
        signature: "",
        lineStart: startLine,
        lineEnd: endLine - 1,
        language
      });
    }
    startLine = endLine;
  }
  return chunks;
}

// src/progress.ts
var import_node_fs7 = require("node:fs");
var import_node_path8 = require("node:path");
var PROGRESS_FILE = "progress.json";
var CACHE_DIR_NAME = ".smart-explore-mcp-cache";
function progressPath(projectRoot) {
  return (0, import_node_path8.join)(projectRoot, CACHE_DIR_NAME, PROGRESS_FILE);
}
function readProgress(projectRoot) {
  const p = progressPath(projectRoot);
  if (!(0, import_node_fs7.existsSync)(p)) return null;
  try {
    return JSON.parse((0, import_node_fs7.readFileSync)(p, "utf-8"));
  } catch {
    return null;
  }
}
function writeProgress(projectRoot, state) {
  const p = progressPath(projectRoot);
  try {
    const dir = (0, import_node_path8.join)(projectRoot, CACHE_DIR_NAME);
    if (!(0, import_node_fs7.existsSync)(dir)) (0, import_node_fs7.mkdirSync)(dir, { recursive: true });
    (0, import_node_fs7.writeFileSync)(p, JSON.stringify(state, null, 2));
  } catch {
  }
}
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
function getProgressStatus(projectRoot) {
  const state = readProgress(projectRoot);
  if (!state) return null;
  if (!Number.isFinite(state.chunksTotal)) state.chunksTotal = state.chunksIndexed;
  if (state.status === "indexing" && !isProcessAlive(state.pid)) {
    state.status = "error";
    state.error = "Indexing process died unexpectedly";
    state.finishedAt = Date.now();
    writeProgress(projectRoot, state);
  }
  return state;
}

// src/indexer.ts
var PROGRESS_WRITE_INTERVAL_MS = 250;
async function indexProject(projectRoot, options) {
  const startTime = Date.now();
  const force = options?.force ?? false;
  const existing = readProgress(projectRoot);
  if (existing?.status === "indexing" && existing.pid !== process.pid && isProcessAlive(existing.pid)) {
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
    error: null
  });
  let totalFiles = 0;
  let processed = 0;
  let indexedChunks = 0;
  let chunksTotal = 0;
  try {
    const store = await IndexStore.open(projectRoot);
    const { files } = await collectSearchableFiles(projectRoot, { projectRoot });
    const indexedFiles = force ? /* @__PURE__ */ new Map() : await store.getIndexedFiles();
    const changedFiles = [];
    for (const file of files) {
      const storedMtime = indexedFiles.get(file.relativePath);
      if (storedMtime === void 0) {
        changedFiles.push(file);
        continue;
      }
      const actualMtime = (0, import_node_fs8.statSync)(file.absolutePath).mtimeMs / 1e3;
      if (actualMtime > storedMtime) {
        changedFiles.push(file);
      }
    }
    const currentPaths = new Set(files.map((f) => f.relativePath));
    const deletedPaths = [];
    for (const path of indexedFiles.keys()) {
      if (!currentPaths.has(path)) {
        deletedPaths.push(path);
      }
    }
    for (const path of deletedPaths) {
      await store.deleteFile(path);
    }
    totalFiles = changedFiles.length;
    processed = 0;
    indexedChunks = 0;
    chunksTotal = 0;
    let lastProgressWrite = 0;
    const writeIndexProgress = (status, forceWrite = false) => {
      const now = Date.now();
      if (!forceWrite && now - lastProgressWrite < PROGRESS_WRITE_INTERVAL_MS) return;
      lastProgressWrite = now;
      const chunkRatio = chunksTotal > 0 ? indexedChunks / chunksTotal : 0;
      const percent = status === "done" ? 100 : chunksTotal > 0 ? Number((chunkRatio * 100).toFixed(1)) : totalFiles > 0 ? Number((processed / totalFiles * 100).toFixed(1)) : 0;
      const filesProcessed = status === "done" ? processed : chunksTotal > 0 ? Number((chunkRatio * totalFiles).toFixed(2)) : processed;
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
        error: null
      });
    };
    if (totalFiles === 0) {
      writeIndexProgress("done", true);
      await store.close();
      return {
        filesProcessed: 0,
        filesTotal: 0,
        chunksIndexed: 0,
        deletedFiles: deletedPaths.length,
        duration: Date.now() - startTime
      };
    }
    const parsed = parseFilesBatch(changedFiles, projectRoot);
    const filesByPath = new Map(changedFiles.map((file) => [file.relativePath, file]));
    const chunkFiles = [];
    for (const [relPath, parsedFile] of parsed) {
      const file = filesByPath.get(relPath);
      if (!file) continue;
      const chunks = chunkFromParsed(file.content, parsedFile);
      const mtime = (0, import_node_fs8.statSync)(file.absolutePath).mtimeMs / 1e3;
      chunkFiles.push({ filePath: relPath, mtime, chunks });
    }
    chunksTotal = chunkFiles.reduce((sum, file) => sum + file.chunks.length, 0);
    writeIndexProgress("indexing", true);
    try {
      if (store.hasEmbedding && chunksTotal > 0) {
        setEmbeddingProgressHandler((chunkCount) => {
          indexedChunks = Math.min(chunksTotal, indexedChunks + chunkCount);
          writeIndexProgress("indexing");
        });
      }
      await store.upsertChunkFiles(chunkFiles, {
        onBatch: (filesProcessed, chunksIndexed) => {
          processed += filesProcessed;
          if (!store.hasEmbedding) {
            indexedChunks = Math.min(chunksTotal, indexedChunks + chunksIndexed);
          }
          writeIndexProgress("indexing", true);
        }
      });
    } finally {
      setEmbeddingProgressHandler(null);
    }
    await store.close();
    processed = totalFiles;
    indexedChunks = chunksTotal;
    writeIndexProgress("done", true);
    return {
      filesProcessed: processed,
      filesTotal: totalFiles,
      chunksIndexed: chunksTotal,
      deletedFiles: deletedPaths.length,
      duration: Date.now() - startTime
    };
  } catch (error) {
    const percent = chunksTotal > 0 ? Number((indexedChunks / chunksTotal * 100).toFixed(1)) : 0;
    const filesProcessed = chunksTotal > 0 ? Number((indexedChunks / chunksTotal * totalFiles).toFixed(2)) : processed;
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
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
function spawnIndexer(projectRoot) {
  const child = (0, import_node_child_process2.spawn)(process.execPath, [process.argv[1], "--index", projectRoot], {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}

// src/cli.ts
var import_promises4 = require("node:fs/promises");
var import_node_path9 = require("node:path");
var packageVersion = true ? "12.2.0" : "0.0.0-dev";
var MAX_OUTLINE_DIRECTORY_FILES = 200;
function formatProgressValue(value, digits = 1) {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}
function formatIndexProgress(percent, filesProcessed, filesTotal, chunksIndexed, chunksTotal) {
  return `${formatProgressValue(percent)}% (${formatProgressValue(filesProcessed, 2)}/${filesTotal} files, ${chunksIndexed}/${chunksTotal} chunks)`;
}
function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) return { command: "", positional: [], flags: {} };
  const command = args[0];
  const positional = [];
  const flags = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next !== void 0 && !next.startsWith("--")) {
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
function emit(text) {
  process.stdout.write(text + "\n");
}
function emitError(text, exitCode = 1) {
  process.stderr.write(text + "\n");
  process.exit(exitCode);
}
async function cmdSearch(positional, flags) {
  const queries = positional.map((q) => q.trim()).filter(Boolean);
  if (queries.length === 0) emitError("Usage: smart-explore search <query> [query2 ...] [--path SUBDIR] [--file-pattern PAT] [--max-results N]");
  const rootDir = process.cwd();
  const maxResults = flags["max-results"] ? parseInt(flags["max-results"], 10) : 20;
  const filePattern = flags["file-pattern"] || null;
  const pathPrefix = flags["path"] || null;
  const WAIT_MS = 9e4;
  const POLL_INTERVAL = 500;
  const deadline = Date.now() + WAIT_MS;
  if (!IndexStore.indexExists(rootDir)) {
    const prog0 = getProgressStatus(rootDir);
    if (!prog0 || prog0.status !== "indexing") {
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
    const indexing = prog?.status === "indexing";
    if (exists && !indexing) break;
    if (prog?.status === "error") {
      emitError(`Indexing failed: ${prog.error || "unknown error"}.
Try: smart-explore index --force`);
    }
    lastPct = prog?.percent ?? lastPct;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
  if (!IndexStore.indexExists(rootDir) || getProgressStatus(rootDir)?.status === "indexing") {
    emit(`Index is still being built (${formatProgressValue(lastPct)}% complete). Retry in ~30s.`);
    return;
  }
  let store;
  try {
    store = await IndexStore.open(rootDir);
  } catch (e) {
    emitError(`Failed to open index: ${e instanceof Error ? e.message : String(e)}.
Try: smart-explore index --force`);
  }
  try {
    if (queries.length === 1) {
      const rows = await store.search(queries[0], filePattern, maxResults, pathPrefix);
      const formatted = formatSearchResults(queries[0], rows, store.hasEmbedding, loadSearchPreviewMode());
      emit(formatted);
    } else {
      const allRows = [];
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
async function cmdUnfold(positional) {
  if (positional.length < 2 || positional.length % 2 !== 0) {
    emitError("Usage: smart-explore unfold <file> <symbol> [<file> <symbol> ...]");
  }
  const results = await Promise.all(Array.from({ length: positional.length / 2 }, async (_, index) => {
    const inputPath = positional[index * 2];
    const symbolName = positional[index * 2 + 1];
    const filePath = (0, import_node_path9.resolve)(inputPath);
    const fileOutline = await getFileOutline(filePath);
    const unfolded = unfoldSymbolFromFolded(fileOutline.content, filePath, fileOutline.foldedFile, symbolName);
    if (unfolded) return unfolded;
    if (fileOutline.foldedFile.symbols.length > 0) {
      const available = fileOutline.foldedFile.symbols.map((s) => s.children && s.children.length > 0 ? `  - ${s.name} (${s.kind}, ${s.children.length} methods \u2014 use \`smart-explore outline ${inputPath}\` to list them)` : `  - ${s.name} (${s.kind})`).join("\n");
      return `Symbol "${symbolName}" not found in ${inputPath}.

Available symbols:
${available}`;
    }
    return `Could not parse ${inputPath}. File may be unsupported or empty.`;
  }));
  emit(results.join("\n\n"));
}
async function cmdOutline(positional) {
  if (positional.length < 1) emitError("Usage: smart-explore outline <file_or_dir>");
  const filePath = (0, import_node_path9.resolve)(positional[0]);
  const target = await (0, import_promises4.stat)(filePath);
  if (target.isDirectory()) {
    const { outlines, truncated, skipped } = await getDirectoryOutline(filePath, MAX_OUTLINE_DIRECTORY_FILES);
    if (outlines.length > 0) {
      const parts = [];
      if (truncated) {
        parts.push(
          `Directory outline limited to the first ${MAX_OUTLINE_DIRECTORY_FILES} files under ${positional[0]}. Narrow the path if you need more.`,
          ""
        );
      }
      if (skipped > 0) {
        parts.push(`Skipped ${skipped} unsupported or empty files.`, "");
      }
      parts.push(outlines.join("\n\n"));
      parts.push("");
      parts.push("\u2500\u2500 Actions \u2500\u2500");
      parts.push("  To read any symbol above: smart-explore unfold <file> <symbol>");
      emit(parts.join("\n"));
      return;
    }
    emit(`Could not parse ${positional[0]}. Directory may contain unsupported or empty files only.`);
    return;
  }
  const content = await (0, import_promises4.readFile)(filePath, "utf-8");
  const parsed = parseFile(content, filePath);
  if (parsed.symbols.length > 0) {
    const text = formatFoldedView(parsed) + "\n\n\u2500\u2500 Actions \u2500\u2500\n  To read any symbol above: smart-explore unfold <file> <symbol>";
    emit(text);
    return;
  }
  emit(`Could not parse ${positional[0]}. File may use an unsupported language or be empty.`);
}
async function cmdCallers(positional, flags) {
  if (positional.length < 1) emitError("Usage: smart-explore callers <symbol> [--path SUBDIR] [--file-pattern PAT] [--max-results N]");
  const rootDir = process.cwd();
  const text = await findCallers(rootDir, positional[0], {
    maxResults: flags["max-results"] ? parseInt(flags["max-results"], 10) : 40,
    filePattern: flags["file-pattern"] || void 0,
    pathPrefix: flags["path"] || void 0
  });
  emit(text);
}
async function cmdCallees(positional, flags) {
  if (positional.length < 1) emitError("Usage: smart-explore callees <symbol> [--path SUBDIR] [--file-pattern PAT] [--max-results N]");
  const rootDir = process.cwd();
  const text = await findCallees(rootDir, positional[0], {
    maxResults: flags["max-results"] ? parseInt(flags["max-results"], 10) : 40,
    filePattern: flags["file-pattern"] || void 0,
    pathPrefix: flags["path"] || void 0
  });
  emit(text);
}
async function cmdRelated(positional, flags) {
  if (positional.length < 1) emitError("Usage: smart-explore related <file> [--path SUBDIR] [--max-results N]");
  const rootDir = process.cwd();
  const text = await relatedFiles(rootDir, positional[0], {
    maxResults: flags["max-results"] ? parseInt(flags["max-results"], 10) : 40,
    pathPrefix: flags["path"] || void 0
  });
  emit(text);
}
async function cmdIndex(flags) {
  const rootDir = process.cwd();
  const force = flags.force === true;
  try {
    const result = await indexProject(rootDir, { force });
    emit(`Indexing complete for ${rootDir}`);
    emit(`  Files processed: ${result.filesProcessed}/${result.filesTotal}`);
    emit(`  Chunks indexed: ${result.chunksIndexed}`);
    emit(`  Deleted files: ${result.deletedFiles}`);
    emit(`  Duration: ${(result.duration / 1e3).toFixed(1)}s`);
  } catch (e) {
    emitError(`Indexing failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
async function cmdStatus(flags) {
  const rootDir = process.cwd();
  const prog = getProgressStatus(rootDir);
  if (!prog) {
    const exists = IndexStore.indexExists(rootDir);
    emit(exists ? `Index exists but no progress file found. Index may be from a previous version. Try smart-explore search directly.` : `No index found for ${rootDir}. Use: smart-explore index`);
    return;
  }
  emit(`Index status for ${rootDir}`);
  emit(`  Status: ${prog.status}`);
  emit(`  Progress: ${formatIndexProgress(prog.percent, prog.filesProcessed, prog.filesTotal, prog.chunksIndexed, prog.chunksTotal)}`);
  if (prog.status === "done" && prog.finishedAt) {
    emit(`  Completed in ${((prog.finishedAt - prog.startedAt) / 1e3).toFixed(1)}s`);
  }
  if (prog.status === "error" && prog.error) {
    emit(`  Error: ${prog.error}`);
  }
}
var HELP = `smart-explore v${packageVersion} \u2014 structural code exploration

Usage: smart-explore <command> [args]

Commands:
  search <query> [query2 ...] [--path SUBDIR] [--file-pattern PAT] [--max-results N]
          Semantic + BM25 code search. Concepts, behavior, "where is X handled?".
          Not exact strings (use grep). Auto-builds index on first run (blocks \u226490s).
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
       Example: --path src/auth/ \u2192 only results from files under src/auth/.

--file-pattern format:
  Substring or *.wildcard to narrow by extension/dir.
  No {brace} expansion, no **/glob paths.

Options:
  --help, -h    Show this help
  --version, -v Show version`;
async function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs[0] === "--index" && rawArgs[1]) {
    const projectRoot = (0, import_node_path9.resolve)(rawArgs[1]);
    const force = rawArgs.includes("--force");
    try {
      const result = await indexProject(projectRoot, { force });
      process.stderr.write(`Indexing complete for ${projectRoot}
  Files processed: ${result.filesProcessed}
  Chunks indexed: ${result.chunksIndexed}
  Duration: ${(result.duration / 1e3).toFixed(1)}s
`);
      process.exit(0);
    } catch (e) {
      process.stderr.write(`Indexing failed: ${e instanceof Error ? e.message : String(e)}
`);
      process.exit(1);
    }
  }
  const { command, positional, flags } = parseArgs(process.argv);
  if (!command || command === "--help" || command === "-h") {
    emit(HELP);
    return;
  }
  if (command === "--version" || command === "-v") {
    emit(packageVersion);
    return;
  }
  isHashlineEditEnabled();
  switch (command) {
    case "search":
      await cmdSearch(positional, flags);
      break;
    case "outline":
      await cmdOutline(positional);
      break;
    case "unfold":
      await cmdUnfold(positional);
      break;
    case "callers":
      await cmdCallers(positional, flags);
      break;
    case "callees":
      await cmdCallees(positional, flags);
      break;
    case "related":
      await cmdRelated(positional, flags);
      break;
    case "index":
      await cmdIndex(flags);
      break;
    case "status":
      await cmdStatus(flags);
      break;
    default:
      emitError(`Unknown command: ${command}
Run 'smart-explore --help' for usage.`);
  }
}
main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}
`);
  process.exit(1);
});
