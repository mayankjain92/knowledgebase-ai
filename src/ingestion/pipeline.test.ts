import { describe, it, expect, vi } from "vitest";
import { IngestionPipeline, IngestionDocument } from "./pipeline.js";
import { RecursiveCharacterChunker } from "./chunker.js";
import { IEmbeddingService, EmbeddingOptions } from "../services/embeddings.js";

// Mock embedding service to verify pipeline behavior without network calls
class MockEmbeddingService implements IEmbeddingService {
  async embedQuery(text: string, options?: EmbeddingOptions): Promise<number[]> {
    return [0.1, 0.2, 0.3];
  }

  async embedChunks(
    chunks: string[],
    options?: EmbeddingOptions
  ): Promise<number[][]> {
    // Returns a dummy 3-dim vector for each chunk
    return chunks.map((_, i) => [0.1 * (i + 1), 0.2 * (i + 1), 0.3 * (i + 1)]);
  }
}

describe("IngestionPipeline", () => {
  const chunker = new RecursiveCharacterChunker();
  const mockEmbedder = new MockEmbeddingService();
  const pipeline = new IngestionPipeline(chunker, mockEmbedder);

  it("should return an empty array if document content or id is empty", async () => {
    const emptyDoc: IngestionDocument = {
      id: "doc-1",
      title: "Empty Doc",
      content: "   ",
    };

    const result = await pipeline.ingest(emptyDoc);
    expect(result).toEqual([]);

    const invalidIdDoc: IngestionDocument = {
      id: "   ",
      title: "No ID",
      content: "Valid content here.",
    };
    const result2 = await pipeline.ingest(invalidIdDoc);
    expect(result2).toEqual([]);
  });

  it("should process a document, chunk it, embed it, and enrich metadata", async () => {
    const doc: IngestionDocument = {
      id: "policy-2026",
      title: "Remote Work Policy",
      content:
        "Section 1: Working hours are flexible.\n\nSection 2: Security protocols require 2FA on all devices.",
      metadata: { department: "HR", version: 2 },
    };

    const chunks = await pipeline.ingest(doc, {
      chunkOptions: { chunkSize: 60, chunkOverlap: 0 },
    });

    expect(chunks.length).toBe(2);

    // Verify first chunk
    expect(chunks[0].id).toBe("policy-2026#chunk-0");
    expect(chunks[0].documentId).toBe("policy-2026");
    expect(chunks[0].text).toBe("Section 1: Working hours are flexible.");
    expect(chunks[0].embedding).toEqual([0.1, 0.2, 0.3]);
    expect(chunks[0].metadata).toEqual({
      department: "HR",
      version: 2,
      title: "Remote Work Policy",
      chunkIndex: 0,
      totalChunks: 2,
    });

    // Verify second chunk
    expect(chunks[1].id).toBe("policy-2026#chunk-1");
    expect(chunks[1].text).toBe(
      "Section 2: Security protocols require 2FA on all devices."
    );
    expect(chunks[1].embedding).toEqual([0.2, 0.4, 0.6]);
    expect(chunks[1].metadata.chunkIndex).toBe(1);
    expect(chunks[1].metadata.totalChunks).toBe(2);
  });

  it("should throw an error if the embedding service returns mismatched count", async () => {
    const faultyEmbedder: IEmbeddingService = {
      embedQuery: vi.fn(),
      embedChunks: vi.fn().mockResolvedValue([[0.1, 0.2]]), // Returns 1 vector for 2 chunks
    };

    const faultyPipeline = new IngestionPipeline(chunker, faultyEmbedder);

    const doc: IngestionDocument = {
      id: "test-doc",
      title: "Test",
      content: "Paragraph 1 here.\n\nParagraph 2 there.",
    };

    await expect(
      faultyPipeline.ingest(doc, { chunkOptions: { chunkSize: 20, chunkOverlap: 0 } })
    ).rejects.toThrow(/Embedding count mismatch/);
  });
});
