import { IChunker, ChunkOptions } from "./chunker.js";
import { IEmbeddingService, EmbeddingOptions } from "../services/embeddings.js";
import { ITextCleaner, TextCleaner } from "./cleaner.js";

export interface IngestionDocument {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface IngestedChunk {
  id: string; // e.g. `${document.id}#chunk-${index}`
  documentId: string;
  text: string;
  index: number;
  startOffset: number;
  endOffset: number;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface PipelineOptions {
  chunkOptions?: ChunkOptions;
  embeddingOptions?: EmbeddingOptions;
}
export class IngestionPipeline {
  private cleaner: ITextCleaner;

  constructor(
    private chunker: IChunker,
    private embeddingService: IEmbeddingService,
    cleaner?: ITextCleaner,
  ) {
    this.cleaner = cleaner ?? new TextCleaner();
  }

  async ingest(
    doc: IngestionDocument,
    options?: PipelineOptions,
  ): Promise<IngestedChunk[]> {
    if (!doc.id || doc.id.trim().length === 0) return [];

    if (!doc.content || doc.content.trim().length === 0) return [];

    const cleanedContent = this.cleaner.clean(doc.content);
    if (cleanedContent.length === 0) return [];

    const rawChunks = this.chunker.chunkText(
      cleanedContent,
      options?.chunkOptions,
    );
    if (rawChunks.length === 0) return [];

    const chunkTexts = rawChunks.map((chunk) => chunk.text);

    const embeddings = await this.embeddingService.embedChunks(
      chunkTexts,
      options?.embeddingOptions,
    );

    if (embeddings.length !== rawChunks.length)
      throw new Error(
        `Embedding count mismatch: generated ${embeddings.length} embeddings for ${rawChunks.length} chunks`,
      );

    return rawChunks.map((chunk, index) => {
      return {
        id: `${doc.id}#chunk-${chunk.index}`,
        documentId: doc.id,
        text: chunk.text,
        index: chunk.index,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        embedding: embeddings[index],
        metadata: {
          ...doc.metadata,
          title: doc.title,
          chunkIndex: chunk.index,
          totalChunks: rawChunks.length,
        },
      };
    });
  }
}
