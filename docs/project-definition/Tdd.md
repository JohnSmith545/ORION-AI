# Technical Design Document: ORION AI (Vertex AI RAG)

## 1. Test Driven Development (TDD) Strategy (Priority)

At ORION AI, quality is not an afterthought. We utilize a **Test-First** approach to ensure a robust, regression-free codebase. Every feature follows the **Red-Green-Refactor** lifecycle.

- **RED:** Write a failing test that defines a specific improvement or new function.
- **GREEN:** Implement the simplest code possible to make the test pass.
- **REFACTOR:** Optimize the code while ensuring the test suite remains green.

**Key Testing Tools:**

- **Vitest:** For unit and integration tests.
- **Playwright:** For end-to-end (E2E) verification.
- **ts-fable / fast-check:** For property-based testing of core logic.

---

## 2. System Architecture (Enterprise-Grade Core)

The system utilizes **Vertex AI** as the core intelligence engine, with a decoupled infrastructure layer.

### 2.1 Component Mapping

| Component         | Technology           | Monorepo Location                          | Description                   |
| :---------------- | :------------------- | :----------------------------------------- | :---------------------------- |
| **Shared Domain** | Zod                  | `packages/shared/src/schemas/rag.ts`       | Validation and types for RAG. |
| **Frontend UI**   | React                | `apps/web/src/components/RAGChat.tsx`      | Interactive chat interface.   |
| **API Layer**     | tRPC                 | `apps/functions/src/trpc/routers/rag.ts`   | Type-safe procedures.         |
| **Model Adapter** | **Google Cloud SDK** | `apps/functions/src/lib/gemini.ts`         | Vertex AI Adapter.            |
| **Vector Port**   | `IVectorStore`       | `apps/functions/src/ports/vector-store.ts` | Hexagonal Port interface.     |

---

## 3. Data Architecture (Utilizing Vertex AI & Firestore)

### 3.1 Intelligence Layer (Vertex AI)

- **Embeddings:** `text-embedding-004` (3072 dimensions).
- **Generation:** `gemini-2.5-flash` for high-speed, cited responses.

### 3.2 Storage Layer

We utilize Firestore's native vector support for scalable semantic retrieval.

- **Method:** `db.collectionGroup('chunks').findNearest('embedding', queryVector, { limit: 5, distanceMeasure: 'COSINE' })`.

---

## 4. API Design (tRPC)

The `ragRouter` orchestrates the flow while remaining agnostic to the specific vector storage implementation.

### 4.1 Implementation Logic

- **`chat`:**
  1. Validate input with `ChatQuerySchema`.
  2. Call Vertex AI to embed query text.
  3. Query the `IVectorStore` (Firestore implementation).
  4. Call Vertex AI (Gemini) for context-aware generation.

- **`ingest`:**
  1. Chunk document (max 1000 chars).
  2. Call Vertex AI to batch embed chunks.
  3. Store text and vectors in Firestore.

---

## 5. Development Roadmap (TDD Focus)

### Phase 1: Shared Domain & Configuration

1. **Red:** Write tests for `rag.ts` schemas.
2. **Green:** Implement schemas and export them.

### Phase 2: Vertex AI Model Adapters

1. **Red:** Unit tests for `embedTexts` and `generateAnswer` (mocking Cloud SDK).
2. **Green:** Implement `gemini.ts` utilizing the `@google-cloud/vertexai` SDK.

### Phase 3: RAG Core & Integration

1. **Red:** Integration test for the Chat flow utilizing Firestore emulator for vector search.
2. **Green:** Implement `ragRouter` and `RAGChat` component.

---

## 6. Security & Infrastructure

- **IAM:** Deploy with `aiplatform.user` and `datastore.user` roles.
- **WIF:** Secure, keyless authentication via Workload Identity Federation.
