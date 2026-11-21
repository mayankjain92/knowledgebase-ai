import { describe, it, expect, vi } from "vitest";
import { RAGEngine } from "./engine.js";
import { IEmbeddingService, EmbeddingOptions } from "../services/embeddings.js";
import { IVectorStore, SearchResult, SearchOptions } from "../storage/vector-store.js";
import { GoogleGenAI } from "@google/genai";

class MockEmbeddingService implements IEmbeddingService {
  async embedQuery(text: string, options?: EmbeddingOptions): Promise<number[]> {
    return [0.1, 0.2, 0.3];
  }
  async embedChunks(chunks: string[], options?: EmbeddingOptions): Promise<number[][]> {
    return chunks.map(() => [0.1, 0.2, 0.3]);
  }
}

class MockVectorStore implements IVectorStore {
  searchResults: SearchResult[] = [];

  async insertDocument(): Promise<void> {}
  async insertChunks(): Promise<void> {}
  async similaritySearch(
    queryVector: number[],
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    return this.searchResults;
  }
  async deleteDocument(): Promise<void> {}
  async close(): Promise<void> {}
}

describe("RAGEngine", () => {
  const mockEmbedder = new MockEmbeddingService();
  const mockVectorStore = new MockVectorStore();

  it("should throw an error for empty or whitespace queries", async () => {
    const engine = new RAGEngine(mockEmbedder, mockVectorStore, "dummy_key");
    await expect(engine.answer("")).rejects.toThrow("Query must not be empty");
    await expect(engine.answer("   ")).rejects.toThrow("Query must not be empty");
  });

  it("should return immediate fallback without calling LLM when no relevant chunks are found", async () => {
    mockVectorStore.searchResults = [];

    const mockGenerateContent = vi.fn();
    const mockAi = {
      models: { generateContent: mockGenerateContent },
    } as unknown as GoogleGenAI;

    const engine = new RAGEngine(
      mockEmbedder,
      mockVectorStore,
      undefined,
      mockAi
    );

    const response = await engine.answer("What is quantum computing?");

    expect(response.query).toBe("What is quantum computing?");
    expect(response.answer).toContain(
      "I cannot find any relevant documents in the knowledge base"
    );
    expect(response.citations).toEqual([]);
    // Ensure zero LLM cost when no chunks are found
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("should construct grounded prompt with passage citations and return LLM answer", async () => {
    const fakeChunk: SearchResult = {
      id: "policy#chunk-0",
      documentId: "policy",
      text: "Employees receive $500 home office equipment stipend after 90 days.",
      chunkIndex: 0,
      startOffset: 0,
      endOffset: 68,
      similarity: 0.88,
      distance: 0.12,
      metadata: { title: "Remote Work Policy" },
    };

    mockVectorStore.searchResults = [fakeChunk];

    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: "Employees are eligible for a $500 stipend after 90 days [1].",
    });

    const mockAi = {
      models: { generateContent: mockGenerateContent },
    } as unknown as GoogleGenAI;

    const engine = new RAGEngine(
      mockEmbedder,
      mockVectorStore,
      undefined,
      mockAi
    );

    const response = await engine.answer(
      "How much is the home office allowance?"
    );

    expect(response.query).toBe("How much is the home office allowance?");
    expect(response.answer).toBe(
      "Employees are eligible for a $500 stipend after 90 days [1]."
    );
    expect(response.citations).toHaveLength(1);
    expect(response.citations[0].id).toBe("policy#chunk-0");

    // Inspect the generated prompt sent to Gemini
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.model).toBe("gemini-3.5-flash-lite");
    expect(callArgs.contents).toContain("--- REFERENCE PASSAGES ---");
    expect(callArgs.contents).toContain("[1] Document: Remote Work Policy (Chunk #0)");
    expect(callArgs.contents).toContain(fakeChunk.text);
    expect(callArgs.contents).toContain("USER QUESTION: How much is the home office allowance?");
  });
});
