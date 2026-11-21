import pg from "pg";
import { IngestionDocument, IngestedChunk } from "../ingestion/pipeline.js";

const { Pool } = pg;

export interface SearchOptions {
  topK?: number;
  documentId?: string;
  minSimilarity?: number;
}

export interface SearchResult {
  id: string;
  documentId: string;
  text: string;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  similarity: number;
  distance: number;
  metadata: Record<string, unknown>;
}

export interface IVectorStore {
  insertDocument(doc: IngestionDocument): Promise<void>;
  insertChunks(chunks: IngestedChunk[]): Promise<void>;
  similaritySearch(
    queryVector: number[],
    options?: SearchOptions,
  ): Promise<SearchResult[]>;
  deleteDocument(documentId: string): Promise<void>;
  close(): Promise<void>;
}

export class PgVectorStore implements IVectorStore {
  private pool: pg.Pool;

  constructor(connectionString?: string) {
    const str = connectionString || process.env.DATABASE_URL;
    this.pool = new Pool({ connectionString: str });
  }

  async insertDocument(doc: IngestionDocument): Promise<void> {
    const query = `INSERT INTO documents (id, title, format, total_pages, metadata) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, metadata = EXCLUDED.metadata;`;
    const format = (doc.metadata?.format as string) || "txt";
    const total_pages = (doc.metadata?.total_pages as number) || 1;

    await this.pool.query(query, [
      doc.id,
      doc.title,
      format,
      total_pages,
      JSON.stringify(doc.metadata || {}),
    ]);
  }

  async insertChunks(chunks: IngestedChunk[]): Promise<void> {
    if (!chunks || chunks.length === 0) return;

    const query = `INSERT INTO document_chunks(id, document_id, text, chunk_index, start_offset, end_offset, embedding, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata;`;
    for (const chunk of chunks) {
      const vectorString = `[${chunk.embedding.join(",")}]`;

      await this.pool.query(query, [
        chunk.id,
        chunk.documentId,
        chunk.text,
        chunk.index,
        chunk.startOffset,
        chunk.endOffset,
        vectorString,
        JSON.stringify(chunk.metadata || {}),
      ]);
    }
  }

  async similaritySearch(
    queryVector: number[],
    options?: SearchOptions,
  ): Promise<SearchResult[]> {
    const topK = options?.topK ?? 5;
    const documentId = options?.documentId ?? null;
    const vectorString = `[${queryVector.join(",")}]`;

    const query = `SELECT 
        id, 
        document_id, 
        text, 
        chunk_index, 
        start_offset, 
        end_offset, 
        metadata,
        (embedding <=> $1) AS distance,
        (1 - (embedding <=> $1)) AS similarity
      FROM document_chunks
      WHERE ($2::varchar IS NULL OR document_id = $2)
      ORDER BY embedding <=> $1 ASC
      LIMIT $3;`;

    const result = await this.pool.query(query, [
      vectorString,
      documentId,
      topK,
    ]);
    let rows: SearchResult[] = result.rows.map((row) => ({
      id: row.id,
      documentId: row.document_id,
      text: row.text,
      chunkIndex: row.chunk_index,
      startOffset: row.start_offset,
      endOffset: row.end_offset,
      similarity: parseFloat(row.similarity),
      distance: parseFloat(row.distance),
      metadata: row.metadata || {},
    }));
    if (options?.minSimilarity !== undefined) {
      rows = rows.filter((r) => r.similarity >= options.minSimilarity!);
    }
    return rows;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.pool.query("DELETE FROM documents WHERE id = $1;", [documentId]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
