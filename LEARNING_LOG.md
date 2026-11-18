# Learning Log: KnowledgeBase AI

This document tracks personal learning milestones, concepts mastered, mistakes made, implementation attempts, and open questions throughout the project.

---

## Template Entry
```markdown
### [YYYY-MM-DD] - Topic / Milestone Name
- **What I Learned**: Key conceptual breakthroughs explained in my own words.
- **What I Implemented**: Concrete code or scripts written.
- **Mistakes & Misunderstandings**: Assumptions that were wrong and how they were corrected.
- **Open Questions / Confusions**: Topics to revisit or investigate further.
```

---

## Log Entries

### [2026-11-18] - Phase 1: Vector Fundamentals & Embedding Service Completed
- **What I Learned**:
  - Why frameworks like LangChain can overcomplicate production RAG: Core RAG is just 1 SQL query, 1 prompt template, and 1 LLM call. Hiding this behind 15 abstraction layers makes debugging latency, prompt drift, and database indexing much harder.
  - Why zero vectors `[0, 0, 0]` are dangerous: Geometrically, they have no direction. In cosine similarity, they cause division by zero ($0/0 = \text{NaN}$). In JavaScript, `NaN` silently poisons sorting algorithms, breaking search results.
  - Why dimension mismatches are fatal: Different embedding models define completely different coordinate spaces. Dimension 42 in one model has nothing to do with dimension 42 in another.
  - The Normalization Revelation: When vectors are normalized to unit length ($\|\mathbf{V}\| = 1$), cosine similarity simplifies to the dot product ($\mathbf{A} \cdot \mathbf{B}$). In database engines like PostgreSQL with `pgvector`, searching normalized vectors using inner product (`<#>`) avoids expensive square roots and divisions.
  - Matryoshka Representation Learning (MRL): Why `gemini-embedding-001` allows truncating 3072 dimensions down to 768 or 256. The training loss explicitly orders information priority from front to back, allowing smaller vector sizes with minimal recall loss.
  - Batching: Passing arrays of chunks in single HTTP requests drastically reduces ingestion latency and avoids 429 RPM rate limits.
- **What I Implemented**:
  - Established project architecture in `docs/architecture.md` and roadmap in `LEARNING_ROADMAP.md`.
  - Configured TypeScript (`tsconfig.json`) and Vitest (`vitest.config.ts`).
  - Implemented `src/math/vector.ts` with strict guard clauses for empty vectors, dimension mismatch, and zero vectors.
  - Created 12 unit tests in `src/math/vector.test.ts`, all passing.
  - Implemented `GeminiEmbeddingService` in `src/services/embeddings.ts` with MRL support and batch chunk generation. Passed type checking.
- **Mistakes & Misunderstandings**:
  - Initially assumed MRL truncation was just arbitrary dimension deletion; learned that the model architecture deliberately trains front dimensions to carry principal semantic weight.
### [2026-11-18] - Phase 2: Recursive Character Chunking
- **What I Learned**:
  - Why naive fixed-character chunking fails: Splitting at fixed character intervals chops words and sentences in half, causing context fragmentation and syntactic nonsense.
  - The Recursive Splitting Hierarchy: Splitting sequentially by `\n\n` (paragraphs) -> `\n` (lines) -> `. ` (sentences) -> ` ` (words) preserves natural human semantic boundaries.
  - The Role of Chunk Overlap: Retaining trailing context from chunk $N$ into chunk $N+1$ prevents critical facts from being split across boundaries.
  - Offset Tracking: Storing character coordinates (`startOffset`, `endOffset`) in the original text allows UI clients to pinpoint and highlight retrieved sources in original documents.
- **What I Implemented**:
  - Implemented `RecursiveCharacterChunker` in `src/ingestion/chunker.ts` with recursion, separator re-attachment, and backward-accumulating overlap.
  - Created 6 unit tests in `src/ingestion/chunker.test.ts` testing empty text, paragraph preservation, sentence overlap, slice offsets, and parameter validation. All 18 tests in the suite passing.
- **Mistakes & Misunderstandings**:
  - Minor interface naming mismatch (`checkText` vs `chunkText`) caught and resolved via TypeScript compiler.
### [2026-11-18] - Phase 2: Ingestion Pipeline & Metadata Enrichment
- **What I Learned**:
  - The Power of Dependency Injection in AI Backends: Injecting `IChunker` and `IEmbeddingService` into `IngestionPipeline` decouples business logic from network SDKs, enabling fast, zero-cost, deterministic unit testing via mock services.
  - Metadata Propagation: Why enriching chunks with structured data (document ID, title, chunk index, total chunks, user tags) is essential for filtering, attribution, and citation in later RAG stages.
  - Chunk Size Dynamics: How chunk size thresholds determine whether paragraphs fit cleanly or get merged/split across boundaries.
- **What I Implemented**:
  - Implemented `IngestionPipeline` in `src/ingestion/pipeline.ts` orchestrating validation, chunking, batch embedding, and metadata enrichment.
  - Created unit tests in `src/ingestion/pipeline.test.ts` using `MockEmbeddingService` to verify empty document handling, chunk/vector pairing, and mismatch detection.
  - All 21 tests in the repository passing.
- **Mistakes & Misunderstandings**:
  - Initially hit a parameter naming typo (`(chunks) => chunk.text`) and unclosed error parentheses, quickly caught and resolved.
### [2026-11-18] - Phase 2: Text Sanitization & Cleaning Engine
- **What I Learned**:
  - The PostgreSQL Null Byte Trap: PostgreSQL UTF-8 text columns throw `0x00` encoding errors if raw PDF/binary text containing null bytes is inserted. Sanitization is a critical defense-in-depth step.
  - Line-break Hyphenation: Why `rejoinHyphenatedWords` matters: tokenizers treat hyphenated line-wrapped words as separate split tokens, destroying semantic retrieval accuracy.
  - Separation of Concerns: Text cleaning is deterministic string normalization; memorizing regex syntax is unnecessary, but understanding *why* text must be sanitized before chunking is essential.
- **What I Implemented**:
  - Created `TextCleaner` in `src/ingestion/cleaner.ts` handling line-break normalization, null byte removal, hyphenated word joining, and whitespace collapsing.
  - Created 5 unit tests in `src/ingestion/cleaner.test.ts`, all passing.
  - Integrated `TextCleaner` into `IngestionPipeline` as a pluggable dependency. Total of 26 tests passing across 4 suites.
- **Mistakes & Misunderstandings**:
  - Realized that memorizing regex patterns is unnecessary boilerplate; focusing on architectural impact (DB crashes, tokenization integrity) is what matters.
### [2026-11-18] - Phase 2: Document Ingestion Pipeline Completed
- **What I Learned**:
  - Distinguishing Boilerplate vs. Core AI Engineering: File I/O (decoding buffers, third-party PDF wrappers, regexes) is plumbing that should not be memorized. Core engineering lies in chunking strategies, semantic boundaries, high-dimensional vector representations, and retrieval math.
  - Multi-Format Normalization: Converting diverse inputs (plain text, markdown, PDF) into a unified `IngestionDocument` schema decouples downstream chunking and embedding from file formats.
- **What I Implemented**:
  - Implemented `DocumentParser` in `src/ingestion/parser.ts` supporting `.txt`, `.md`, and `.pdf` (using `pdf-parse` v2).
  - Added unit tests in `src/ingestion/parser.test.ts`. Total of 29 unit tests across 5 test suites all passing.
  - Completed Phase 2: Document Ingestion Pipeline.
- **Mistakes & Misunderstandings**:
  - None.
### [2026-11-18] - Phase 2: Knowledge Verification Passed
- **What I Learned**:
  - The Ingestion Sequence: File Parsing -> Text Sanitization -> Recursive Chunking -> Batch Embedding.
  - The Offset Drift Trap: Sanitizing text after chunking corrupts character offset coordinates. Sanitizing first guarantees that `startOffset` and `endOffset` remain strictly aligned with the cleaned text.
  - Context Window Starvation: Excessive chunk overlap (e.g. 80%) leads to duplicate retrieval, starving the LLM prompt of diverse information while multiplying embedding costs.
- **What I Implemented**:
  - Completed all Phase 2 milestones and verified with 29 passing unit tests.
- **Mistakes & Misunderstandings**:
  - None.
- **Open Questions / Confusions**:
  - How pgvector stores 768-dim vectors in PostgreSQL pages and how HNSW graph indexing achieves sub-millisecond search.
