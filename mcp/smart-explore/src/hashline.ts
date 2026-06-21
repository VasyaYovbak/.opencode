/**
 * Hashline utilities — pure-JS xxHash32 + line-anchor formatting.
 *
 * Produces `{lineNumber}#{hash}|{content}` anchors that the hashline-edit
 * tool matches against. The hash is xxHash32 of the normalized line content
 * (CR stripped, trailing whitespace trimmed); seed is 0 when the line has any
 * letter/digit, otherwise the line number (so blank/whitespace-only lines still
 * get stable per-line hashes).
 *
 * Config: `hashline_edit` boolean read once from the opencode config dir
 * (~/.config/opencode/oh-my-openagent.json or legacy oh-my-opencode, .jsonc
 * variants supported) and cached for the process lifetime.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// --- Dictionary (256 two-letter combos from the 16-char nibble table) ---

const NIBBLE_STR = "ZPMQVRWSNKTXJBYH";
const HASHLINE_DICT: string[] = Array.from({ length: 256 }, (_, i) => {
  const high = i >>> 4;
  const low = i & 0x0f;
  return `${NIBBLE_STR[high]}${NIBBLE_STR[low]}`;
});

// --- xxHash32 (pure-JS port, no native bindings) ---

const PRIME32_1 = 0x9e3779b1;
const PRIME32_2 = 0x85ebca77;
const PRIME32_3 = 0xc2b2ae3d;
const PRIME32_4 = 0x27d4eb2f;
const PRIME32_5 = 0x165667b1;
const encoder = new TextEncoder();

function rotateLeft32(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

function readUint32LittleEndian(input: Uint8Array, offset: number): number {
  return (
    ((input[offset] ?? 0) |
      ((input[offset + 1] ?? 0) << 8) |
      ((input[offset + 2] ?? 0) << 16) |
      ((input[offset + 3] ?? 0) << 24)) >>>
    0
  );
}

function round32(accumulator: number, value: number): number {
  const added = (accumulator + Math.imul(value, PRIME32_2)) >>> 0;
  return Math.imul(rotateLeft32(added, 13), PRIME32_1) >>> 0;
}

function xxHash32Js(input: Uint8Array, seed: number): number {
  let offset = 0;
  const length = input.length;
  let hash: number;

  if (length >= 16) {
    const limit = length - 16;
    let v1 = (seed + PRIME32_1 + PRIME32_2) >>> 0;
    let v2 = (seed + PRIME32_2) >>> 0;
    let v3 = seed >>> 0;
    let v4 = (seed - PRIME32_1) >>> 0;

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

    hash = (rotateLeft32(v1, 1) + rotateLeft32(v2, 7)) >>> 0;
    hash = (hash + rotateLeft32(v3, 12)) >>> 0;
    hash = (hash + rotateLeft32(v4, 18)) >>> 0;
  } else {
    hash = (seed + PRIME32_5) >>> 0;
  }

  hash = (hash + length) >>> 0;

  while (offset + 4 <= length) {
    hash = (hash + Math.imul(readUint32LittleEndian(input, offset), PRIME32_3)) >>> 0;
    hash = Math.imul(rotateLeft32(hash, 17), PRIME32_4) >>> 0;
    offset += 4;
  }

  while (offset < length) {
    hash = (hash + Math.imul(input[offset] ?? 0, PRIME32_5)) >>> 0;
    hash = Math.imul(rotateLeft32(hash, 11), PRIME32_1) >>> 0;
    offset += 1;
  }

  hash = (hash ^ (hash >>> 15)) >>> 0;
  hash = Math.imul(hash, PRIME32_2) >>> 0;
  hash = (hash ^ (hash >>> 13)) >>> 0;
  hash = Math.imul(hash, PRIME32_3) >>> 0;

  return (hash ^ (hash >>> 16)) >>> 0;
}

function hashXxh32(input: string, seed: number): number {
  return xxHash32Js(encoder.encode(input), seed >>> 0);
}

// --- Hashline formatting ---

const RE_SIGNIFICANT = /[\p{L}\p{N}]/u;

export function computeLineHash(lineNumber: number, content: string): string {
  const normalized = content.replace(/\r/g, "").trimEnd();
  const seed = RE_SIGNIFICANT.test(normalized) ? 0 : lineNumber;
  const index = hashXxh32(normalized, seed) % 256;
  return HASHLINE_DICT[index];
}

export function formatHashLine(lineNumber: number, content: string): string {
  const hash = computeLineHash(lineNumber, content);
  return `${lineNumber}#${hash}|${content}`;
}

export function lineAnchor(lineNumber: number, content: string): string {
  return `${lineNumber}#${computeLineHash(lineNumber, content)}`;
}

export function parseAnchor(anchor: string): { lineNumber: number; hash: string } | null {
  const match = anchor.match(/^(\d+)#([A-Z]{2})$/);
  if (!match) return null;
  return { lineNumber: parseInt(match[1], 10), hash: match[2] };
}

export function verifyLineAnchor(lineNumber: number, content: string, expectedHash: string): boolean {
  return computeLineHash(lineNumber, content) === expectedHash;
}

// --- Config (read once, cached) ---

let cachedEnabled: boolean | null = null;

function stripJsonComments(text: string): string {
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

function resolveOpencodeConfigDirs(): string[] {
  const dirs = new Set<string>();
  const custom = process.env.OPENCODE_CONFIG_DIR?.trim();
  if (custom) dirs.add(custom);
  const xdg = process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), ".config");
  dirs.add(join(xdg, "opencode"));
  return [...dirs];
}

function readHashlineEditFlag(): boolean {
  const basenames = ["oh-my-openagent", "oh-my-opencode"];
  const exts = [".json", ".jsonc"];
  for (const dir of resolveOpencodeConfigDirs()) {
    for (const base of basenames) {
      for (const ext of exts) {
        const candidate = join(dir, base + ext);
        if (!existsSync(candidate)) continue;
        try {
          const raw = readFileSync(candidate, "utf-8");
          const parsed = JSON.parse(stripJsonComments(raw));
          if (parsed && typeof parsed === "object" && typeof parsed.hashline_edit === "boolean") {
            return parsed.hashline_edit;
          }
        } catch {
          // ignore malformed config files
        }
      }
    }
  }
  return false;
}

export function isHashlineEditEnabled(): boolean {
  if (cachedEnabled === null) {
    cachedEnabled = readHashlineEditFlag();
  }
  return cachedEnabled;
}
