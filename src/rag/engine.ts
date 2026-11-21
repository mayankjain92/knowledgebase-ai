import { GoogleGenAI } from "@google/genai";
import { IEmbeddingService } from "../services/embeddings.js";
import {
  IVectorStore,
  SearchResult,
  SearchOptions,
} from "../storage/vector-store.js";

export interface RAGQueryOptions extends SearchOptions {
  model?: string;
  systemInstruction?: string;
}

export interface RAGResponse {
  query: string;
  answer: string;
  citations: SearchResult[];
}

export interface IRAGEngine {
  answer(query: string, options?: RAGQueryOptions): Promise<RAGResponse>;
}

export class RAGEngine implements IRAGEngine {
  private ai: GoogleGenAI;
  private defaultModel = "gemini-3.5-flash-lite";

  constructor(
    private embeddingService: IEmbeddingService,
    private vectorStore: IVectorStore,
    apiKey?: string,
    aiClient?: GoogleGenAI,
  ) {
    if (aiClient) {
      this.ai = aiClient;
    } else {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) throw new Error("Gemini api key not found");
      this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  private buildPrompt(
    query: string,
    chunks: SearchResult[],
    customInstruction?: string,
  ): string {
    const system =
      customInstruction ||
      `You are a knowledgeable assistant answering questions based strictly on the provided documentation.

CRITICAL INSTRUCTIONS:
1. Answer the question using ONLY the facts directly mentioned in the REFERENCE PASSAGES below.
2. If the passages do not contain enough information to answer the question, state:
   "I cannot find the answer to this question in the provided documentation."
3. Do NOT speculate or use external knowledge.
4. Always cite the passage number (e.g. [1], [2]) when making statements.`;

    const formattedPassages = chunks
      .map((chunk, index) => {
        const title = (chunk.metadata.title as string) || chunk.documentId;
        return `[${index + 1}] Document: ${title} (Chunk #${chunk.chunkIndex})\n${chunk.text}`;
      })
      .join("\n\n");

    return `${system}

--- REFERENCE PASSAGES ---
${formattedPassages}
--------------------------

USER QUESTION: ${query}
GROUNDED ANSWER (with [citations]):`;
  }

  async answer(query: string, options?: RAGQueryOptions): Promise<RAGResponse> {
    if (!query || query.trim().length === 0) {
      throw new Error("Query must not be empty");
    }

    const queryVector = await this.embeddingService.embedQuery(query);

    const citations = await this.vectorStore.similaritySearch(
      queryVector,
      options,
    );

    if (citations.length === 0) {
      return {
        query,
        answer:
          "I cannot find any relevant documents in the knowledge base to answer your question.",
        citations: [],
      };
    }

    const prompt = this.buildPrompt(
      query,
      citations,
      options?.systemInstruction,
    );

    const response = await this.ai.models.generateContent({
      model: options?.model || this.defaultModel,
      contents: prompt,
    });

    const answerText = response.text || "No response generated.";

    return {
      query,
      answer: answerText,
      citations,
    };
  }
}
