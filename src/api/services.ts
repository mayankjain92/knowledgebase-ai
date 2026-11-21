import { RecursiveCharacterChunker } from "../ingestion/chunker.js";
import { TextCleaner } from "../ingestion/cleaner.js";
import { DocumentParser } from "../ingestion/parser.js";
import { IngestionPipeline } from "../ingestion/pipeline.js";
import { RAGEngine } from "../rag/engine.js";
import { GeminiEmbeddingService } from "../services/embeddings.js";
import { PgVectorStore } from "../storage/vector-store.js";

export const parser = new DocumentParser();
export const cleaner = new TextCleaner();
export const chunker = new RecursiveCharacterChunker();
export const embedder = new GeminiEmbeddingService();
export const vectorStore = new PgVectorStore();
export const pipeline = new IngestionPipeline(chunker, embedder, cleaner);
export const ragEngine = new RAGEngine(embedder, vectorStore);
