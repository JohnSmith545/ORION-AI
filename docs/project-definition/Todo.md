# Todo: Serverless RAG

### Phase 1: Foundation & Serverless Setup

**Goal:** Configure Firestore for vector search and prepare the monorepo.

- [ ] **Firestore Configuration**
  - [ ] Task: Enable Firestore Native Vector Search (if not active).
  - [ ] Task: Create a composite index for kNN search on `chunks` sub-collection.
- [x] **Monorepo Configuration**
  - [x] Add secrets: `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`.
  - [x] Install `@google/genai` and `google-auth-library`.

---

### Phase 2: Shared Domain & TDD Foundation

**Goal:** Define types and write initial validation tests.

- [x] **Schemas (TDD)**
  - [x] 🔴 Write Test: `packages/shared/src/schemas/rag.test.ts`.
  - [x] 🟢 Implement: `packages/shared/src/schemas/rag.ts` (Zod).
- [ ] **Types & Interfaces**
  - [ ] Task: Define shared response types for citations and similarity scores.

---

### Phase 3: Backend Implementation (TDD Lifecycle)

**Goal:** Implement serverless logic with full test coverage.

- [ ] **Gemini Adapter (`src/lib/gemini.ts`)**
  - [ ] 🔴 Write Test: Unit tests for embedding generation (mocking API).
  - [ ] 🟢 Implement: `embedTexts` using `text-embedding-004`.
- [ ] **Ingestion Logic (`src/lib/ingest.ts`)**
  - [ ] 🔴 Write Test: Logic for chunking and batch embedding.
  - [ ] 🟢 Implement: Ingestion flow (PDF -> Text -> Chunks -> Firestore).
- [ ] **tRPC Chat Procedure**
  - [ ] 🔴 Write Test: Procedure integration test (mocking Firestore kNN).
  - [ ] 🟢 Implement: `chat` procedure mapping: `User Query -> kNN -> Prompt -> Gemini`.

---

### Phase 4: Frontend Implementation (Motion & A11y)

**Goal:** Build the UI with high polish and accessibility.

- [ ] **Admin UI (Ingestion)**
  - [ ] 🔴 Write Test: Admin page form validaton and mutation triggering.
  - [ ] 🟢 Implement: `Admin.tsx` with upload status feedback.
- [ ] **Chat Component (`RAGChat.tsx`)**
  - [ ] 🔴 Write Test: A11y audit using `jest-axe` on the chat interface.
  - [ ] 🟢 Implement: Chat UI with motion transitions and footnote citations.

---

### Phase 5: Verification & Deployment

**Goal:** Final QA and serverless deployment.

- [ ] **E2E Testing**
  - [ ] Task: Write Playwright scripts for "Ask a question about a NASA doc".
- [ ] **Deployment**
  - [ ] Task: Deploy Cloud Functions via GitHub Actions.
  - [ ] Task: Verify $0 idle cost in GCP Billing console.
