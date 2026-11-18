import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export interface EmbeddingOptions {
  outputDimensionality?: number;
}

export interface IEmbeddingService {
  embedQuery(text: string, options?: EmbeddingOptions): Promise<number[]>;
  embedChunks(
    chunks: string[],
    options?: EmbeddingOptions,
  ): Promise<number[][]>;
}

export class GeminiEmbeddingService implements IEmbeddingService {
  private ai: GoogleGenAI;
  private defaultModel = "gemini-embedding-001";
  private defaultDimension = 768;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        "GEMINI_API_KEY is not defined. Please set it in your .env or pass it to the constructor.",
      );
    }
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  async embedQuery(
    text: string,
    options?: EmbeddingOptions,
  ): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error(
        "Invalid query: text must not be empty or whitespace only",
      );
    }

    const response = await this.ai.models.embedContent({
      model: this.defaultModel,
      contents: text,
      config: {
        outputDimensionality:
          options?.outputDimensionality ?? this.defaultDimension,
      },
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || values.length === 0) {
      throw new Error("Gemini API failed to return embedding values");
    }

    return values;
  }

  async embedChunks(
    chunks: string[],
    options?: EmbeddingOptions,
  ): Promise<number[][]> {
    if (!chunks || chunks.length === 0) {
      throw new Error("Invalid chunks: array must not be empty");
    }

    for (let i = 0; i < chunks.length; i++) {
      if (!chunks[i] || chunks[i].trim().length === 0) {
        throw new Error(`Chunk at index ${i} is empty or whitespace only`);
      }
    }

    // Single HTTP batch request: passing the array of chunks to contents
    const response = await this.ai.models.embedContent({
      model: this.defaultModel,
      contents: chunks,
      config: {
        outputDimensionality:
          options?.outputDimensionality ?? this.defaultDimension,
      },
    });

    if (!response.embeddings || response.embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding count mismatch: expected ${chunks.length}, received ${response.embeddings?.length ?? 0}`,
      );
    }

    return response.embeddings.map((e, index) => {
      if (!e.values || e.values.length === 0) {
        throw new Error(`Missing embedding values for chunk at index ${index}`);
      }
      return e.values;
    });
  }
}
