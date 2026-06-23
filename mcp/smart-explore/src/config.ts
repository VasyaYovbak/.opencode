import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface EmbeddingConfig {
  baseUrl: string;
  model: string;
  dim: number;
  queryPrompt: string;
  maxBatchSize: number;
  maxConcurrency: number;
}

const DEFAULT_QUERY_PROMPT = "Instruct: Given a coding question, retrieve relevant code or docs.\nQuery: ";
const DEFAULT_MAX_BATCH_SIZE = 64;
const DEFAULT_MAX_CONCURRENCY = 4;

const configCache = new Map<string, EmbeddingConfig | null>();

function resolveUserConfigPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), ".config");
  return join(xdg, "opencode", "smart-explore-config.json");
}

function validateConfig(raw: unknown): EmbeddingConfig | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const root = raw as Record<string, unknown>;
  const emb = root.embedding;
  if (!emb || typeof emb !== "object" || Array.isArray(emb)) return null;
  const e = emb as Record<string, unknown>;

  if (typeof e.baseUrl !== "string" || !e.baseUrl.trim()) return null;
  if (typeof e.model !== "string" || !e.model.trim()) return null;
  if (typeof e.dim !== "number" || !Number.isInteger(e.dim) || e.dim <= 0) return null;

  return {
    baseUrl: e.baseUrl.trim(),
    model: e.model.trim(),
    dim: e.dim,
    queryPrompt: typeof e.queryPrompt === "string" ? e.queryPrompt : DEFAULT_QUERY_PROMPT,
    maxBatchSize: typeof e.maxBatchSize === "number" && e.maxBatchSize > 0
      ? e.maxBatchSize
      : DEFAULT_MAX_BATCH_SIZE,
    maxConcurrency: typeof e.maxConcurrency === "number" && e.maxConcurrency > 0
      ? e.maxConcurrency
      : DEFAULT_MAX_CONCURRENCY,
  };
}

export function loadEmbeddingConfig(projectRoot?: string): EmbeddingConfig | null {
  const cacheKey = projectRoot || "<global>";
  if (configCache.has(cacheKey)) return configCache.get(cacheKey)!;

  if (projectRoot) {
    const projectConfigPath = join(projectRoot, ".smart-explore.json");
    if (existsSync(projectConfigPath)) {
      try {
        const raw = JSON.parse(readFileSync(projectConfigPath, "utf-8"));
        const config = validateConfig(raw);
        if (config) {
          configCache.set(cacheKey, config);
          return config;
        }
      } catch {}
    }
  }

  const userConfigPath = resolveUserConfigPath();
  if (existsSync(userConfigPath)) {
    try {
      const raw = JSON.parse(readFileSync(userConfigPath, "utf-8"));
      const config = validateConfig(raw);
      if (config) {
        configCache.set(cacheKey, config);
        return config;
      }
    } catch {}
  }

  configCache.set(cacheKey, null);
  return null;
}

export function clearEmbeddingConfigCache(): void {
  configCache.clear();
}
