import pkg from "@lancedb/lancedb";
const { connect, Index, rerankers } = pkg;
import { join } from "node:path";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Chunk } from "./chunker.js";
import { getEmbeddingFunction } from "./embed.js";

const TABLE_NAME = "chunks";
const INDEX_DIR_NAME = ".smart-explore-mcp-cache";
const FTS_COLUMNS = ["content", "symbol_name", "signature"];

export interface SearchRow {
  content: string;
  file_path: string;
  symbol_name: string;
  kind: string;
  signature: string;
  line_start: number;
  line_end: number;
  hash_start: string;
  language: string;
  _distance: number;
}

export interface ChunkFileBatch {
  filePath: string;
  mtime: number;
  chunks: Chunk[];
}

function escapeSqlString(s: string): string {
  return s.replace(/'/g, "''");
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export class IndexStore {
  readonly #projectRoot: string;
  readonly #indexDir: string;
  #db: Awaited<ReturnType<typeof connect>>;
  #table: any;
  #hasEmbedding: boolean;
  #rrf: any | null;

  private constructor(
    projectRoot: string,
    indexDir: string,
    db: Awaited<ReturnType<typeof connect>>,
    table: any,
    hasEmbedding: boolean,
    rrf: any | null,
  ) {
    this.#projectRoot = projectRoot;
    this.#indexDir = indexDir;
    this.#db = db;
    this.#table = table;
    this.#hasEmbedding = hasEmbedding;
    this.#rrf = rrf;
  }

  static getIndexDir(projectRoot: string): string {
    return join(projectRoot, INDEX_DIR_NAME);
  }

  static indexExists(projectRoot: string): boolean {
    return existsSync(join(projectRoot, INDEX_DIR_NAME, "lancedb"));
  }

  static async open(projectRoot: string): Promise<IndexStore> {
    getEmbeddingFunction(projectRoot);

    const indexDir = join(projectRoot, INDEX_DIR_NAME);
    const dbDir = join(indexDir, "lancedb");

    if (!existsSync(indexDir)) mkdirSync(indexDir, { recursive: true });

    const db = await connect(dbDir);
    const tableNames = await db.tableNames();
    let table: any;
    let hasEmbedding: boolean;

    if (tableNames.includes(TABLE_NAME)) {
      table = await db.openTable(TABLE_NAME);
      const schema = await table.schema();
      hasEmbedding = schema.metadata?.has("embedding_functions") ?? false;
      await IndexStore.ensureFtsIndices(table);
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
          file_mtime: 0.0,
        },
      ];

      if (hasEmbedding) {
        table = await db.createTable(TABLE_NAME, placeholder, {
          mode: "overwrite",
          embeddingFunction: {
            sourceColumn: "content",
            vectorColumn: "vector",
            function: embedFn,
          },
        });
      } else {
        table = await db.createTable(TABLE_NAME, placeholder, {
          mode: "overwrite",
        });
      }

      await table.delete("content = ''");
      await IndexStore.createFtsIndices(table);
    }

    let rrf: any | null = null;
    if (hasEmbedding) {
      try {
        rrf = await rerankers.RRFReranker.create();
      } catch {
        rrf = null;
      }
    }

    return new IndexStore(projectRoot, indexDir, db, table, hasEmbedding, rrf);
  }

  static async destroy(projectRoot: string): Promise<void> {
    const indexDir = join(projectRoot, INDEX_DIR_NAME);
    rmSync(indexDir, { recursive: true, force: true });
  }

  static async createFtsIndices(table: any): Promise<void> {
    for (const col of FTS_COLUMNS) {
      await table.createIndex(col, { config: Index.fts() });
    }
  }

  static async ensureFtsIndices(table: any): Promise<void> {
    const existing = await table.listIndices();
    const indexedCols = new Set(existing.map((i: any) => i.columns?.[0]).filter(Boolean));
    for (const col of FTS_COLUMNS) {
      if (!indexedCols.has(col)) {
        await table.createIndex(col, { config: Index.fts() });
      }
    }
  }

  get hasEmbedding(): boolean {
    return this.#hasEmbedding;
  }

  async upsertChunks(filePath: string, mtime: number, chunks: Chunk[]): Promise<void> {
    await this.upsertChunkFiles([{ filePath, mtime, chunks }]);
  }

  async upsertChunkFiles(
    files: ChunkFileBatch[],
    options?: { maxRowsPerBatch?: number; onBatch?: (filesProcessed: number, chunksIndexed: number) => void },
  ): Promise<void> {
    const maxRowsPerBatch = options?.maxRowsPerBatch ?? 512;
    let rows: Array<Record<string, unknown>> = [];
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
          file_mtime: file.mtime,
        });
      }

      if (rows.length >= maxRowsPerBatch) await flush();
    }

    await flush();
    if (batchFiles > 0) options?.onBatch?.(batchFiles, batchChunks);
  }

  async deleteFile(filePath: string): Promise<void> {
    const escaped = escapeSqlString(filePath);
    await this.#table.delete(`file_path = '${escaped}'`);
  }

  async search(query: string, filePattern: string | null, limit: number, pathPrefix?: string | null): Promise<SearchRow[]> {
    const overfetch = Math.min(limit * 3, 100);

    let q: any;
    if (this.#hasEmbedding) {
      q = this.#table.search(query).limit(overfetch);
    } else {
      q = this.#table.search(query, "fts").limit(overfetch);
    }

    const conditions: string[] = [];
    if (filePattern) {
      const likePattern = filePattern.replace(/\*/g, '%');
      conditions.push(`file_path LIKE '%${escapeSqlString(likePattern)}%'`);
    }
    if (pathPrefix) {
      const normalized = pathPrefix.replace(/^\.\//, '').replace(/\/$/, '');
      conditions.push(`file_path LIKE '${escapeSqlString(normalized)}%'`);
    }
    if (conditions.length > 0) {
      q = q.where(conditions.join(' AND '));
    }

    if (this.#hasEmbedding && this.#rrf) {
      q = q.rerank(this.#rrf);
    }

    const results = await q.toArray();
    return results.slice(0, limit).map((r: any) => ({
      content: r.content,
      file_path: r.file_path,
      symbol_name: r.symbol_name,
      kind: r.kind,
      signature: r.signature,
      line_start: r.line_start,
      line_end: r.line_end,
      hash_start: r.hash_start,
      language: r.language,
      _distance: r._distance ?? 0,
    }));
  }

  async countRows(): Promise<number> {
    return this.#table.countRows();
  }

  async getIndexedFiles(): Promise<Map<string, number>> {
    const results = await this.#table.query()
      .select(["file_path", "file_mtime"])
      .toArray();

    const fileMtimes = new Map<string, number>();
    for (const r of results) {
      const current = fileMtimes.get(r.file_path) ?? 0;
      if (r.file_mtime > current) {
        fileMtimes.set(r.file_path, r.file_mtime);
      }
    }
    return fileMtimes;
  }

  async close(): Promise<void> {
    try {
      this.#table.close();
    } catch {}
  }
}
