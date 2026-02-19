# Todo: Utilizing Vertex AI (ORION AI RAG)

### Phase 1: Foundation & Project Setup

**Goal:** Prepare the environment and establish types.

- [ ] **Google Cloud Configuration**
  - [x] Enable APIs: `aiplatform.googleapis.com`, `firestore.googleapis.com`.
  - [x] Configure Service Account with `aiplatform.user` and `datastore.user` roles.
  - [ ] Configure Workload Identity Federation (WIF) for CI/CD access.
- [x] **Monorepo Setup**
  - [x] Install `@google-cloud/vertexai` in `apps/functions`.
  - [x] Add `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION` to `.env`.
  - [x] Create `apps/functions/src/lib/gemini.ts` scaffolding.
- [x] **Type Definition (TDD)**
  - [x] 🔴 Write Test: `packages/shared/src/schemas/rag.test.ts`.
  - [x] 🟢 Implement: `packages/shared/src/schemas/rag.ts` (Zod schemas).

---

### Phase 2: Ingestion Pipeline

**Goal:** Process and store documents as searchable vectors.

- [x] **Document Loading**
  - [x] 🔴 Write Test: Mock GCS/URL fetch and verify raw text extraction.
  - [x] 🟢 Implement: `src/lib/ingest.ts` -> `fetchContent(url)`.
- [x] **Text Chunking**
  - [x] 🔴 Write Test: Verify chunking with overlapping windows (1000 chars, 200 overlap).
  - [x] 🟢 Implement: `src/lib/ingest.ts` -> `chunkText(text)`.
- [x] **Vertex AI Embeddings**
  - [x] 🔴 Write Test: Mock `text-embedding-004` response for multiple chunks.
  - [x] 🟢 Implement: `src/lib/gemini.ts` -> `embedTexts(chunks[])`.
- [x] **Firestore Storage**
  - [x] 🔴 Write Test: Verify batch write to `docs` and `docs/{id}/chunks` sub-collections.
  - [x] 🟢 Implement: `src/lib/ingest.ts` -> `saveToFirestore(doc, chunks)`.

---

### Phase 3: RAG Retrieval & Generation

**Goal:** Conversational AI powered by context retrieval.

- [x] **Query Processing**
  - [x] 🔴 Write Test: Verify query embedding logic.
  - [x] 🟢 Implement: `src/lib/rag.ts` -> `getQueryEmbedding(userQuery)`.
- [x] **Semantic Retrieval**
  - [x] 🔴 Write Test: Verify `findNearest` (kNN) query returns top results.
  - [x] 🟢 Implement: `src/lib/rag.ts` -> `retrieveContext(vector)`.
- [x] **Grounding & Generation**
  - [x] 🔴 Write Test: Verify prompt template includes retrieved context and instructions.
  - [x] 🟢 Implement: `src/lib/gemini.ts` -> `generateGroundedResponse(query, context)`.
- [x] **tRPC Procedure**
  - [x] 🔴 Write Test: Integration test for `chat` mutation (Red-Green-Refactor).
  - [x] 🟢 Implement: `apps/functions/src/trpc/routers/rag.ts` -> `chat` procedure.

---

### Phase 4: Frontend Development

**Goal:** A premium, responsive chat experience.

- [ ] **Core Chat Component**
  - [ ] 🔴 Write Test: Verify message list renders user/model roles correctly.
  - [ ] 🟢 Implement: `apps/web/src/components/RAGChat.tsx` state management.
- [ ] **markdown Rendering**
  - [ ] Task: Integrate `react-markdown` with syntax highlighting for code blocks.
- [ ] **Citation System**
  - [ ] Task: Implement footnote UI for displaying source links.
- [ ] **Admin Dash**
  - [ ] Task: Create file upload form and ingestion status tracker.

---

### Phase 5: Verification & Launch

**Goal:** Production readiness and quality assurance.

- [ ] **Automated Testing**
  - [ ] Task: Unit tests for all adapters (100% logic coverage).
  - [ ] Task: Playwright E2E tests (Ingest -> Chat -> Verify Answer).
- [ ] **Observability**
  - [ ] Task: Add structured logging for retrieval similarity scores and LLM latency.
- [ ] **Deployment**
  - [ ] Task: Deploy to production via GitHub Actions.
  - [ ] Task: Final A11y and performance audit.
