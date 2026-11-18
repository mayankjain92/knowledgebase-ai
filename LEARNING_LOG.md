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
- **Open Questions / Confusions**:
  - How to determine the ideal chunk size and overlap for different document structures.
