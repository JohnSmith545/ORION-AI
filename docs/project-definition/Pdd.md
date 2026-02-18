# Product Design: Serverless RAG Chatbot Integration

## 1. Executive Summary

We are building a Retrieval-Augmented Generation (RAG) Chatbot integrated into the **Orion AI** monorepo. This system enables users to query a custom knowledge base with accuracy secured via **Gemini 2.5 Flash** and semantic retrieval powered by **Firestore Native Vector Search**.

- **Goal:** Provide accurate, cited answers using Gemini 2.5 Flash.
- **Key Constraint:** Achieve **$0 fixed cost when idle** by utilizing serverless kNN search natively in Firestore, following the "Hacker Route" architecture.
- **Stack:** React, tRPC, Firebase Cloud Functions, Firestore (Vector Search), Gemini API.

---

## 2. System Architecture

A lean, serverless architecture designed for minimal budget drain:

| Logical Component         | Technology                         | Monorepo Location                  |
| :------------------------ | :--------------------------------- | :--------------------------------- |
| **Frontend**              | Vite + React                       | `apps/web`                         |
| **API Layer**             | tRPC                               | `apps/functions`                   |
| **Embeddings**            | `text-embedding-004`               | `apps/functions/src/lib/gemini.ts` |
| **Vector DB & Doc Store** | **Firestore Native Vector Search** | GCP (Serverless)                   |
| **LLM (Generation)**      | Gemini 2.5 Flash                   | `apps/functions/src/lib/gemini.ts` |

---

## 3. Data Model Design (Firestore Native)

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

1. **Red Stage:** Write failing unit/integration tests for every feature (e.g., chunking, embedding logic).
2. **Green Stage:** Implement the minimum code required to pass the tests.
3. **Refactor Stage:** Clean and optimize implementation without breaking verified functionality.

---

## 6. Security & Cost Controls

- **$0 Idle Cost:** No dedicated servers or index endpoints are deployed.
- **RBAC:** Admin-only routes for document ingestion.
- **Budgeting:** Firestore usage scales directly with user queries, fitting within the $50 target.
