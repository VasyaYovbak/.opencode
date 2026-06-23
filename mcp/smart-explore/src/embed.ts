import { TextEmbeddingFunction, getRegistry } from "@lancedb/lancedb/embedding";
import { Float32 } from "apache-arrow";
import { loadEmbeddingConfig, type EmbeddingConfig } from "./config.js";

const DEFAULT_QUERY_PROMPT = "Instruct: Given a coding question, retrieve relevant code or docs.\nQuery: ";
const DEFAULT_MAX_BATCH_SIZE = 64;
const DEFAULT_MAX_CONCURRENCY = 4;

type EmbeddingProgressHandler = ((processed: number) => void) | null;
let embeddingProgressHandler: EmbeddingProgressHandler = null;

export class F2LLMEmbeddingFunction extends TextEmbeddingFunction {
  readonly #baseUrl: string;
  readonly #model: string;
  readonly #dim: number;
  readonly #queryPrompt: string;
  readonly #maxBatchSize: number;
  readonly #maxConcurrency: number;

  constructor(optionsRaw?: Partial<EmbeddingConfig>) {
    super();
    const options = this.resolveVariables(optionsRaw ?? {});
    this.#baseUrl = options.baseUrl ?? "";
    this.#model = options.model ?? "";
    this.#dim = options.dim ?? 0;
    this.#queryPrompt = options.queryPrompt ?? DEFAULT_QUERY_PROMPT;
    this.#maxBatchSize = options.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE;
    this.#maxConcurrency = options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
  }

  ndims(): number {
    return this.#dim;
  }

  embeddingDataType() {
    return new Float32();
  }

  async #embedBatch(texts: string[], mode: "query" | "doc"): Promise<number[][]> {
    if (texts.length === 0) return [];
    const inputs = mode === "query" ? texts.map((t) => this.#queryPrompt + t) : texts;
    const batchSize = mode === "doc" && embeddingProgressHandler ? Math.min(this.#maxBatchSize, 8) : this.#maxBatchSize;
    const batches: Array<{ offset: number; texts: string[] }> = [];
    const allResults: number[][] = new Array(inputs.length);

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
          body: JSON.stringify({ model: this.#model, input: batch.texts }),
        });
        if (!resp.ok) {
          const body = await resp.text().catch(() => "");
          throw new Error(`Embedding HTTP ${resp.status}: ${body}`);
        }
        const data = (await resp.json()) as {
          data: Array<{ embedding: number[]; index: number }>;
        };
        for (const d of data.data) allResults[batch.offset + d.index] = d.embedding;
        if (mode === "doc") embeddingProgressHandler?.(batch.texts.length);
      }
    });

    await Promise.all(workers);

    return allResults;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return this.#embedBatch(texts, "doc");
  }

  async computeSourceEmbeddings(data: string[]): Promise<number[][]> {
    return this.#embedBatch(data, "doc");
  }

  async computeQueryEmbeddings(data: string): Promise<number[]> {
    const [vec] = await this.#embedBatch([data], "query");
    return vec;
  }
}

let registered = false;
function ensureRegistered(): void {
  if (registered) return;
  try {
    getRegistry().register("f2llm")(F2LLMEmbeddingFunction);
  } catch {
    // already registered
  }
  registered = true;
}

let cachedFunction: F2LLMEmbeddingFunction | null | undefined;

export function getEmbeddingFunction(projectRoot?: string): F2LLMEmbeddingFunction | null {
  ensureRegistered();
  if (cachedFunction !== undefined) return cachedFunction;

  const config = loadEmbeddingConfig(projectRoot);
  if (!config) {
    cachedFunction = null;
    return null;
  }

  cachedFunction = new F2LLMEmbeddingFunction(config);
  return cachedFunction;
}

export function isEmbeddingAvailable(projectRoot?: string): boolean {
  return getEmbeddingFunction(projectRoot) !== null;
}

export function setEmbeddingProgressHandler(handler: EmbeddingProgressHandler): void {
  embeddingProgressHandler = handler;
}

export function clearEmbeddingFunctionCache(): void {
  cachedFunction = undefined;
}
