# KnowledgeBase AI

A full-stack Retrieval-Augmented Generation (RAG) app for asking questions about your own documents. Upload PDF, DOCX, Markdown, or plain-text files, retrieve relevant passages with PostgreSQL and pgvector, and get Gemini-generated answers grounded in those passages with citations.

> **Project status:** Core document ingestion, dense vector retrieval, grounded chat, and a Next.js interface are implemented. Hybrid search and reranking are not included yet.

## Screenshot

> **Screenshot placeholder:** Add a screenshot of the running KnowledgeBase AI interface here once a demo is available. Suggested capture: the dashboard with an uploaded document, a streamed answer, and its citation/source cards.

## Features

- Parse PDF, DOCX, Markdown, and TXT documents.
- Clean and recursively chunk document text, generate Gemini embeddings, and store chunks in PostgreSQL with pgvector.
- Retrieve relevant chunks using cosine similarity and an HNSW vector index.
- Answer questions using retrieved context, with numbered citations and a no-context fallback.
- Stream chat responses over Server-Sent Events (SSE).
- Upload, list, search, and delete documents in the web interface.
- Unit and integration tests for backend components and API behavior.

## Tech stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, assistant-ui
- **Backend:** Node.js, Express, TypeScript
- **AI:** Google Gemini API for embeddings and answer generation
- **Database:** PostgreSQL 16 with pgvector
- **Testing:** Vitest, Supertest

## Architecture

```mermaid
flowchart LR
    UI[Next.js web app] -->|REST and SSE| API[Express API]
    API --> ING[Parse, clean, chunk]
    ING --> EMB[Gemini embeddings]
    EMB --> DB[(PostgreSQL + pgvector)]
    API -->|Embed query and search| DB
    DB -->|Relevant passages| RAG[Grounded RAG engine]
    RAG -->|Gemini answer stream with citations| API
    API --> UI
```

## Run locally

### Prerequisites

- Node.js and npm
- pnpm `11.12.0` for the frontend
- Docker with Docker Compose
- A Google Gemini API key

### 1. Start PostgreSQL with pgvector

From the repository root:

```bash
docker compose up -d postgres
```

The Compose service exposes PostgreSQL on port `5433` and initializes the schema from `migrations/` on the first database start.

> The Compose file contains development-only database credentials. Do not expose this database publicly; change the credentials before using it outside local development.

### 2. Configure and start the backend

Create a root `.env` file:

```dotenv
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5433/knowledgebase_ai
GEMINI_API_KEY=your_gemini_api_key
```

Then install dependencies and start the API:

```bash
npm ci
npm run dev
```

The API listens on `http://localhost:5000`. Check `http://localhost:5000/api/health` for the health endpoint.

### 3. Configure and start the frontend

In a second terminal:

```bash
cd web
```

Create `web/.env.local`:

```dotenv
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000/api
```

Install the frontend dependencies using pnpm `11.12.0`, then run:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/documents` | List indexed documents |
| `POST` | `/api/documents/upload` | Upload a document as multipart form data using the `file` field |
| `DELETE` | `/api/documents/:id` | Delete a document and its chunks |
| `POST` | `/api/chat` | Get a non-streaming RAG answer |
| `POST` | `/api/chat/stream` | Stream a RAG answer and citations using SSE |

## Tests and type checking

From the repository root:

```bash
npm test
npm run typecheck
```

## Current limitations

- Retrieval currently uses dense vector similarity; hybrid keyword/vector search and reranking are future improvements.
- The backend and frontend require their respective local environment variables and a running PostgreSQL/pgvector database.
- The screenshot above is a placeholder until a live or locally running app can be captured.
