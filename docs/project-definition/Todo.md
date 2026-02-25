# Todo: Utilizing Vertex AI (ORION AI RAG)

### Phase 1: Foundation & Project Setup

**Goal:** Prepare the environment and establish types.

- [x] **Google Cloud Configuration**
  - [x] Enable APIs: `aiplatform.googleapis.com`, `firestore.googleapis.com`.
  - [x] Configure Service Account with `aiplatform.user` and `datastore.user` roles.
  - [x] Configure Workload Identity Federation (WIF) for CI/CD access.
- [x] **Monorepo Setup**
  - [x] Install AI SDK in `apps/functions` (migrated from `@google-cloud/vertexai` → `@google/genai`).
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
  - [x] 🔴 Write Test: Verify batch write to `documentChunks` and `documentChunks/{id}/chunks` sub-collections.
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

### Phase 3.5: Authentication & User Management

**Goal:** Secure user access with Firebase Authentication before the chat UI.

- [x] **Firebase Setup**
  - [x] Configure Firebase project and add `VITE_FIREBASE_*` variables to `.env`.
  - [x] Implement `apps/web/src/lib/firebase.ts` (initialises `auth` and `db`).
  - [x] Point Vite to monorepo-root `.env` via `envDir: '../../'` in `vite.config.ts`.
- [x] **Auth Page & Layout**
  - [x] Implement `apps/web/src/pages/Auth.tsx` (login/signup toggle).
  - [x] Implement `apps/web/src/features/auth/components/AuthLayout.tsx` (cosmic-themed wrapper).
- [x] **Login Form**
  - [x] Email/password sign-in via `signInWithEmailAndPassword`.
  - [x] Google sign-in via `signInWithPopup`.
- [x] **Signup Form**
  - [x] Implement `apps/web/src/features/auth/components/SignupForm.tsx`.
- [x] **Routing**
  - [x] Root `/` redirects to `/auth`; all unknown routes redirect to `/auth`.

---

### Phase 4: Frontend Development

**Goal:** A premium, responsive chat experience.

- [x] **Core Chat Component**
  - [x] 🟢 Implement: `apps/web/src/components/dashboard/DashboardChatSection.tsx` — full message list with user/assistant roles, state management, typing indicator, auto-scroll, and chat history via tRPC mutation.
- [x] **Markdown Rendering**
  - [x] Task: Custom `renderMarkdown()` in `DashboardChatSection.tsx` — renders **bold**, bullet lists, numbered lists, and paragraphs.
- [x] **Citation System**
  - [x] Task: Source links displayed under each assistant message in a "Sources" section with citation URIs from RAG responses.
- [x] **Admin Dash**
  - [x] Task: `AdminIngestPanel` in `DashboardSidebarLeft.tsx` — URI input, title field, API/GCS source type selector, ingestion status/error feedback, and role-gated visibility (admin only).

---

### Phase 5: Verification & Launch

**Goal:** Production readiness and quality assurance.

- [x] **Automated Testing**
  - [x] Task: Unit tests for adapters — `gemini.test.ts`, `ingest.test.ts`, `rag.test.ts`, `rag.test.ts` (router), `user.test.ts` (router), `rag.test.ts` (schema), `user.test.ts` (schema). _(Coverage may not be 100%.)_
  - [x] Task: Playwright E2E tests — auth flows (`auth.spec.ts`) and dashboard interactions (`dashboard.spec.ts`) with Firebase emulator fixtures.
- [x] **Observability**
  - [x] Task: Add structured logging for retrieval similarity scores and LLM latency.
- [ ] **Deployment**
  - [x] Task: Deploy to production via GitHub Actions (`ci.yml`, `deploy-dev.yml`, `deploy-stage.yml`, `deploy-main.yml`, `release.yml`).
  - [ ] Task: Final A11y and performance audit.
