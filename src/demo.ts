import "dotenv/config";
import { DocumentParser } from "./ingestion/parser.js";
import { TextCleaner } from "./ingestion/cleaner.js";
import { RecursiveCharacterChunker } from "./ingestion/chunker.js";
import { GeminiEmbeddingService } from "./services/embeddings.js";
import { IngestionPipeline } from "./ingestion/pipeline.js";
import { PgVectorStore } from "./storage/vector-store.js";
import { RAGEngine } from "./rag/engine.js";

async function main() {
  console.log("=== KNOWLEDGEBASE AI: END-TO-END RAG DEMO ===\n");

  // 1. Initialize services
  const parser = new DocumentParser();
  const cleaner = new TextCleaner();
  const chunker = new RecursiveCharacterChunker();
  const embedder = new GeminiEmbeddingService();
  const vectorStore = new PgVectorStore();
  const pipeline = new IngestionPipeline(chunker, embedder, cleaner);
  const ragEngine = new RAGEngine(embedder, vectorStore);

  try {
    // 2. Create a realistic sample document
    const rawDocumentContent = `
# Engineering & Operations Handbook (2026)

## Section 1: Remote Work & Equipment Policy
Full-time engineering team members are eligible for a $750 home office equipment reimbursement after completing 60 days of tenure. 
Eligible expenses include ergonomic desk chairs, external monitors, and noise-cancelling headphones.
All purchased equipment remains company property for the first 12 months of employment.

## Section 2: Security & Authentication Protocols
Every employee must enable FIDO2 hardware security keys (e.g., YubiKey) for all corporate accounts. 
SMS-based two-factor authentication (2FA) is strictly prohibited due to SIM-swapping vulnerabilities.
Laptops must have disk encryption (FileVault or BitLocker) active at all times with automatic 5-minute screen lockouts.

## Section 3: Annual Paid Time Off (PTO)
Employees receive 22 days of paid time off per calendar year, accruing at 1.83 days per month.
Unused leave may roll over up to a maximum of 5 days into the following calendar year.
`;

    console.log("1. Ingesting sample policy document...");
    const parsedDoc = await parser.parse(
      Buffer.from(rawDocumentContent),
      "engineering_handbook_2026.md"
    );
    const ingestionDoc = parser.toIngestionDocument(parsedDoc);

    const ingestedChunks = await pipeline.ingest(ingestionDoc, {
      chunkOptions: { chunkSize: 250, chunkOverlap: 40 },
    });

    console.log(`   Document parsed into ${ingestedChunks.length} chunks.`);
    console.log("   Saving chunks and 768-dim embeddings to PostgreSQL (pgvector)...");

    await vectorStore.insertDocument(ingestionDoc);
    await vectorStore.insertChunks(ingestedChunks);
    console.log("   Chunks stored with active HNSW indexing.\n");

    // 3. Query 1: Information present in the knowledge base
    const query1 = "What are the rules regarding 2FA and why is SMS prohibited?";
    console.log(`2. Asking Query 1: "${query1}"`);
    console.log("   Retrieving from pgvector and generating grounded answer with Gemini...\n");

    const response1 = await ragEngine.answer(query1, { topK: 3 });
    console.log("--- ANSWER ---");
    console.log(response1.answer);
    console.log("\n--- CITATIONS ---");
    response1.citations.forEach((c, i) => {
      console.log(`[${i + 1}] ${c.id} (Similarity: ${(c.similarity * 100).toFixed(1)}%)`);
      console.log(`    "${c.text.replace(/\n/g, " ")}"`);
    });
    console.log("\n" + "=".repeat(60) + "\n");

    // 4. Query 2: Information NOT in the knowledge base (Testing Anti-Hallucination)
    const query2 = "What is the company policy on flying business class for domestic travel?";
    console.log(`3. Asking Query 2 (Out of Scope): "${query2}"`);
    console.log("   Checking anti-hallucination guardrail...\n");

    const response2 = await ragEngine.answer(query2, { topK: 2, minSimilarity: 0.65 });
    console.log("--- ANSWER ---");
    console.log(response2.answer);
    console.log("--- CITATIONS COUNT ---:", response2.citations.length);

    console.log("\n=== DEMO COMPLETED SUCCESSFULLY ===");
  } finally {
    await vectorStore.close();
  }
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
