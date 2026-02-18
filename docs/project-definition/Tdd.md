# Technical Design Document: ORION AI (Serverless RAG)

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

## 2. System Architecture

We utilize a serverless architecture to minimize costs while maintaining high performance.

### 2.1 Component Mapping

| Component         | Technology | Monorepo Location                        | Description                     |
| :---------------- | :--------- | :--------------------------------------- | :------------------------------ |
| **Shared Domain** | Zod        | `packages/shared/src/schemas/rag.ts`     | Validation and types for RAG.   |
| **Frontend UI**   | React      | `apps/web/src/components/RAGChat.tsx`    | Interactive chat interface.     |
| **API Layer**     | tRPC       | `apps/functions/src/trpc/routers/rag.ts` | Type-safe procedures.           |
| **RAG Adapter**   | Node.js    | `apps/functions/src/lib/gemini.ts`       | Gemini & Firestore integration. |
| **Vector DB**     | Firestore  | GCP                                      | Native kNN search (Serverless). |

---

## 3. Data Architecture

### 3.1 Firestore Schema

- **Collection:** `docs`
  - `id`: UUID string.
  - `title`: Document title.
  - `createdAt`: ISO Timestamp.
- **Sub-collection:** `docs/{docId}/chunks`
  - `text`: String content of the chunk.
  - `embedding`: Vector (3072 dims) using Firestore's `VECTOR` type.

### 3.2 Vector Search

- **Model:** `text-embedding-004`.
- **Method:** `db.collectionGroup('chunks').findNearest('embedding', queryVector, { limit: 5, distanceMeasure: 'COSINE' })`.

---

## 4. API Design (tRPC)

The `ragRouter` handles both chat and admin-level ingestion.

### 4.1 Implementation Logic

- **`chat`:**
  1. Validate input with `ChatQuerySchema`.
  2. Embed query text.
  3. Perform `findNearest` in Firestore.
  4. Hydrate context and call Gemini for grounded generation.
- **`ingest`:**
  1. Validate with `IngestDocSchema`.
  2. Chunk document (max 1200 chars).
  3. Batch embed chunks.
  4. Transactionally store in Firestore.

---

## 5. Development Plan (TDD Roadmap)

### Phase 1: Shared Domain & Configuration

1. **Red:** Write tests for `rag.ts` schemas.
2. **Green:** Implement schemas and export them.

### Phase 2: Backend Adapters

1. **Red:** Write unit tests for `chunkText` and `embedTexts` (mocking API).
2. **Green:** Implement `gemini.ts` adapter logic.

### Phase 3: Integration & UI

1. **Red:** Integration test for `rag.chat` procedure with Firestore emulator.
2. **Green:** Implement `ragRouter` and `RAGChat` component.

### Phase 4: Final Verification

1. Playwright E2E tests for the full user flow.
2. Performance audit for retrieval latency.
