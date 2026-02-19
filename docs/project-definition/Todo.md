# ORION AI Implementation Plan

## Phase 1: Foundation & Infrastructure (The Environment Tests)

**Goal:** Prepare Google Cloud resources using the "Serverless" architecture.

- [ ] **GCP Project Configuration**
  - [ ] **Task:** Enable APIs (`aiplatform.googleapis.com`, `firestore.googleapis.com`).
  - [ ] **Task:** Create **Firestore Database** (Native mode).
  - [ ] **Task:** Create **Firestore Vector Index** (Composite index on `chunks` collection).
  - [ ] **Verification (Manual Test):** Run `gcloud firestore indexes composite list` to verify the vector index exists.
- [ ] **IAM Security Setup**
  - [ ] **Task:** Grant permissions to Cloud Build Service Account (`roles/run.admin`, `roles/iam.serviceAccountUser`).
  - [ ] **Task:** Grant permissions to Runtime Service Account:
    - `roles/aiplatform.user` (For generating embeddings).
    - `roles/datastore.user` (For storing data AND vector search).
    - `roles/storage.objectViewer` (For GCS ingestion).
  - [ ] **Verification (Manual Test):** Use `gcloud projects get-iam-policy` to confirm roles.
- [x] **Monorepo Configuration**
  - [x] **Task:** Add secrets (`GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`) to `.env` and GitHub Secrets.
  - [x] **Task:** Install backend dependencies (`@google/genai`, `google-auth-library`).
  - [ ] **Verification:** Run `pnpm dev` in `apps/functions` to ensure no startup crashes.

## Phase 2: Shared Domain Layer (TDD)

**Goal:** Define and validate the data contract.

- [x] **Chat & Ingestion Schemas**
  - [x] **🔴 Write Test:** Create `packages/shared/src/schemas/rag.test.ts`.
    - Assert `ChatQuerySchema` rejects empty questions or strings > 1000 chars.
    - Assert `IngestDocSchema` rejects invalid URLs.
  - [x] **🟢 Implement:** Create `packages/shared/src/schemas/rag.ts` and export Zod schemas.
  - [x] **Refactor:** Export from `packages/shared/src/index.ts` and verify imports work.

## Phase 3: Backend Implementation (`apps/functions`)

**Goal:** Implement the "Brain" using Vertex AI for embeddings and Firestore for storage/search.

- [ ] **Ingestion Logic (Chunking)**

  - [ ] **🔴 Write Test:** Create `apps/functions/src/lib/ingest.test.ts`.
    - Test `chunkText()`: Provide a long string and assert it splits into segments < 1200 chars.
  - [ ] **🟢 Implement:** Write `chunkText` function in `apps/functions/src/lib/ingest.ts`.

- [ ] **Vertex AI Adapter (Embeddings Only)**

  - [ ] **🔴 Write Test:** Create `apps/functions/src/lib/vertex.test.ts`.
    - Mock `@google/genai`.
    - Test `embedTexts`: Assert it calls the SDK with `gemini-embedding-001`.
  - [ ] **🟢 Implement:** Write `getAuthClient` and `embedTexts` in `apps/functions/src/lib/vertex.ts`.

- [ ] **Ingestion Workflow (Firestore Vector Storage)**

  - [ ] **🔴 Write Test:** Add `ingestDocument` test to `ingest.test.ts`.
    - Mock `vertex.embedTexts` and Firestore.
    - Assert that `doc` metadata is saved.
    - Assert that `chunks` are saved with **both** `text` field and `embedding` (vector) in the same document.
  - [ ] **🟢 Implement:** Write `ingestDocument` logic in `ingest.ts`.

- [ ] **tRPC Router (Chat with Firestore Search)**
  - [ ] **🔴 Write Test:** Create `apps/functions/src/trpc/routers/rag.test.ts`.
    - Mock Firestore `findNearest()` query.
    - Test `chat` procedure: Assert it embeds question, calls `findNearest` on Firestore, and prompts Gemini.
  - [ ] **🟢 Implement:** Create `ragRouter` in `apps/functions/src/trpc/routers/rag.ts` using Firestore Vector Search.
  - [ ] **Refactor:** Add `ragRouter` to `appRouter`.

## Phase 4: Frontend Implementation (`apps/web`)

**Goal:** Build UI components that are verified to interact with the API correctly.

- [ ] **Chat Component Logic**

  - [ ] **🔴 Write Test:** Create `apps/web/src/components/RAGChat.test.tsx`.
    - Mock `trpc.rag.chat.useMutation`.
    - Test loading states and submission logic.
  - [ ] **🟢 Implement:** Create `RAGChat.tsx` using `@repo/ui` components.

- [ ] **Chat Response Rendering**

  - [ ] **🔴 Write Test:** Add rendering tests to `RAGChat.test.tsx`.
    - Test that markdown and citations are rendered correctly.
  - [ ] **🟢 Implement:** Update `RAGChat.tsx` with markdown support.

- [ ] **Admin Ingestion Page**
  - [ ] **🔴 Write Test:** Create `apps/web/src/pages/Admin.test.tsx`.
    - Test form validation and submission to `trpc.rag.ingest`.
  - [ ] **🟢 Implement:** Create `Admin.tsx` page.

## Phase 5: Verification & Launch

**Goal:** Confirm everything works together.

- [ ] **Local Testing**

  - [ ] **Task:** Run `pnpm test` (Unit tests).
  - [ ] **Task:** Run `pnpm dev` with Firestore Emulator (v11.2+) to test Vector Search locally.

- [ ] **Deployment**

  - [ ] **Task:** Push code to `dev` branch.
  - [ ] **Verification:** Watch GitHub Actions `deploy-dev.yml` logs.

- [ ] **Smoke Test**
  - [ ] **Task:** Ingest a document via the deployed Admin page.
  - [ ] **Verification:** Ask a question in the Chat UI and verify the response is grounded in that document.
