import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PgVectorStore } from "./vector-store.js";
import { IngestionDocument, IngestedChunk } from "../ingestion/pipeline.js";

describe("PgVectorStore Integration Tests", () => {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgrespassword@localhost:5433/knowledgebase_ai";

  let vectorStore: PgVectorStore;

  // Helper function to create a 768-dimensional dummy vector with a specific bias
  function createTestVector(seed: number): number[] {
    const vec = new Array(768).fill(0);
    // Put distinctive weights in the first few dimensions
    vec[0] = Math.sin(seed);
    vec[1] = Math.cos(seed);
    vec[2] = seed * 0.1;

    // Normalize to unit length for clean cosine similarity
    const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return vec.map((v) => v / mag);
  }

  beforeAll(() => {
    vectorStore = new PgVectorStore(connectionString);
  });

  afterAll(async () => {
    // Cleanup test documents if any remain and close pool
    await vectorStore.deleteDocument("test_doc_alpha");
    await vectorStore.deleteDocument("test_doc_beta");
    await vectorStore.close();
  });

  it("should insert a document and its chunks into PostgreSQL", async () => {
    const doc: IngestionDocument = {
      id: "test_doc_alpha",
      title: "Alpha Architecture Guide",
      content: "This is test content.",
      metadata: { format: "md", author: "Mayank" },
    };

    await vectorStore.insertDocument(doc);

    const vec0 = createTestVector(1);
    const vec1 = createTestVector(2);

    const chunks: IngestedChunk[] = [
      {
        id: "test_doc_alpha#chunk-0",
        documentId: "test_doc_alpha",
        text: "Section 1: Microservices and vector databases.",
        index: 0,
        startOffset: 0,
        endOffset: 45,
        embedding: vec0,
        metadata: { title: doc.title, chunkIndex: 0 },
      },
      {
        id: "test_doc_alpha#chunk-1",
        documentId: "test_doc_alpha",
        text: "Section 2: Machine learning pipelines with PostgreSQL.",
        index: 1,
        startOffset: 46,
        endOffset: 100,
        embedding: vec1,
        metadata: { title: doc.title, chunkIndex: 1 },
      },
    ];

    await vectorStore.insertChunks(chunks);

    // Query with the exact vector of chunk 0
    const results = await vectorStore.similaritySearch(vec0, { topK: 2 });

    expect(results.length).toBeGreaterThanOrEqual(1);
    // Chunk 0 must rank #1 with similarity close to 1.0 (exact match)
    expect(results[0].id).toBe("test_doc_alpha#chunk-0");
    expect(results[0].similarity).toBeCloseTo(1.0, 3);
    expect(results[0].distance).toBeCloseTo(0.0, 3);
  });

  it("should filter results by documentId", async () => {
    const docBeta: IngestionDocument = {
      id: "test_doc_beta",
      title: "Beta Operations Manual",
      content: "Beta content.",
      metadata: { format: "txt" },
    };

    await vectorStore.insertDocument(docBeta);

    const vecBeta = createTestVector(10);
    const betaChunk: IngestedChunk = {
      id: "test_doc_beta#chunk-0",
      documentId: "test_doc_beta",
      text: "Beta Operations only.",
      index: 0,
      startOffset: 0,
      endOffset: 21,
      embedding: vecBeta,
      metadata: { title: docBeta.title },
    };

    await vectorStore.insertChunks([betaChunk]);

    // Search specifically within test_doc_beta
    const results = await vectorStore.similaritySearch(vecBeta, {
      documentId: "test_doc_beta",
      topK: 5,
    });

    expect(results).toHaveLength(1);
    expect(results[0].documentId).toBe("test_doc_beta");

    // Search specifically within test_doc_alpha using vecBeta
    const alphaResults = await vectorStore.similaritySearch(vecBeta, {
      documentId: "test_doc_alpha",
      topK: 5,
    });

    // All returned chunks must belong to test_doc_alpha
    for (const r of alphaResults) {
      expect(r.documentId).toBe("test_doc_alpha");
    }
  });

  it("should cascade delete chunks when a document is deleted", async () => {
    await vectorStore.deleteDocument("test_doc_alpha");

    const queryVec = createTestVector(1);
    const results = await vectorStore.similaritySearch(queryVec, {
      documentId: "test_doc_alpha",
    });

    // All chunks belonging to test_doc_alpha must be gone
    expect(results).toHaveLength(0);
  });
});
