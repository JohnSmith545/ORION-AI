# Product Design: Vertex AI RAG Chatbot Integration

## 1. Executive Summary

ORION AI is a Retrieval-Augmented Generation (RAG) platform designed to showcase the power of **Vertex AI** and **Google Cloud**. This system enables accurate, cited interactions with custom knowledge bases by utilizing Vertex AI's state-of-the-art models for both semantic understanding and text generation.

- **Goal:** Utilize **Vertex AI** (Gemini 2.5 Flash & text-embedding-004) to provide high-quality RAG capabilities.
- **Architecture:** A serverless RAG implementation leveraging **Firestore Native Vector Search** for scalable, efficient semantic retrieval.
- **Enterprise Path:** The architecture is designed to scale to **Vertex AI Vector Search** for production-grade, sub-millisecond requirements.

---

## 2. System Architecture (The Vertex AI Stack)

The architecture prioritizes Vertex AI for intelligence while maintaining serverless efficiency:

| Component         | Technology                           | Role                                  |
| :---------------- | :----------------------------------- | :------------------------------------ |
| **Embeddings**    | **Vertex AI (`text-embedding-004`)** | Semantic vector generation.           |
| **Generation**    | **Vertex AI (`Gemini 2.5 Flash`)**   | Context-aware answer generation.      |
| **Vector Search** | **Firestore (Native Vector Search)** | Serverless semantic retrieval.        |
| **API Layer**     | tRPC + Cloud Functions               | Type-safe orchestration.              |
| **Doc Store**     | Firestore                            | Persistent metadata and text storage. |

---

## 3. Data Model Design

### A. Document Schema

We store text and vectors together in Firestore documents to enable atomic ingestion and simplified retrieval.

- **Collection:** `docs`

  - `id`: Auto-ID
  - `title`: `string`
  - `sourceUri`: `string`
  - `createdAt`: `Timestamp`

- **Sub-collection:** `docs/{docId}/chunks`
  - `text`: The text chunk (~1000 chars)
  - `embedding`: `vector` (3072 dimensions, kNN indexed)

### B. Retrieval Strategy

- **Search:** Use Firestore's `findNearest()` to fetch the top-k most relevant chunks.
- **Optimization:** Filter results based on metadata to ensure high-quality context.

---

## 4. Component Design

### Layer 1: Shared Domain (`packages/shared`)

Type-safe schemas (`ChatQuerySchema`, `ChatResponseSchema`) ensure consistency across the monorepo.

### Layer 2: Backend Logic (`apps/functions`)

- **Adapter (`gemini.ts`):** Wraps embedding generation and LLM calls.
- **Router (`rag.ts`):** Orchestrates the RAG flow: `Embed Query -> Firestore kNN -> Generate Answer`.

### Layer 3: Frontend Interface (`apps/web`)

A modern, responsive chat UI featuring:

- Markdown rendering for AI responses.
- Footnote citations linking to source documents.
- Optimistic UI for instant messaging feel.

---

## 5. Test-Driven Development (TDD) Strategy

To ensure "Level 5" quality, we adopt a strict TDD lifecycle:

1. **Red Stage:** Draft failing tests for Vertex AI API interactions and data transformations.
2. **Green Stage:** Implement minimum logic to fulfill the AI requirements.
3. **Refactor Stage:** Clean code to maintain Hexagonal decoupling.

---

## 6. Implementation Phases

### Phase 1: Foundation & Project Setup

Initialize Google Cloud project, enable necessary APIs (Vertex AI, Firestore), and finalize monorepo configuration including shared schemas and type definitions.

### Phase 2: Ingestion Pipeline

Implement the document processing flow: fetching content, chunking text, generating embeddings via Vertex AI, and storing both text and vectors in Firestore.

### Phase 3: RAG Retrieval & Generation

Develop the core conversational logic: embedding user queries, performing kNN search in Firestore, and generating grounded responses using Gemini 2.5 Flash.

### Phase 4: Frontend Development

Build the chat interface using React and `@repo/ui`, integrating the tRPC procedures for real-time interactions and citation display.

### Phase 5: Verification & Launch

Execute comprehensive testing (Vitest, Playwright), perform A11y and performance audits, and deploy to Cloud Functions via the CI/CD pipeline.

---

## 7. Security & Observability

- **Security:** Use of Workload Identity Federation (WIF) and restricted IAM roles as per Google Cloud security best practices.
- **Monitoring:** Implement structured logging and custom metrics to track RAG performance and model latency.
