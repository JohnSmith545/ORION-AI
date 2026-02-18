Based on the **Product Design Document**, **Technical Design Document**, and adhering to the **Test Driven Development (TDD)** methodology, here is the adjusted To-Do list.

This plan follows the **Red (Write Test) -> Green (Implement) -> Refactor** cycle. Every significant piece of logic must have a failing test before implementation begins.

### Phase 1: Foundation & Infrastructure (The Environment Tests)

**Goal:** Verify the "stage" is set correctly before writing code.

- [ ] **GCP Project Configuration**
- **Task:** Enable APIs (`aiplatform`, `firestore`) and create Vector Index/Endpoint.
- **Verification (Manual Test):** Run `gcloud ai index-endpoints list --region=<REGION>` and ensure your endpoint appears with status `READY`.

- [ ] **IAM Security Setup**
- **Task:** Grant permissions to Cloud Build and Runtime Service Accounts .

- **Verification (Manual Test):** Use `gcloud projects get-iam-policy` to grep for `roles/aiplatform.user` on your specific service account email.

- [x] **Monorepo Configuration**
  - [x] **Task:** Add secrets (`GOOGLE_CLOUD_PROJECT`, `VECTOR_INDEX_ID`) to `.env` and GitHub Secrets.
  - [x] **Task:** Install backend dependencies (`@google/genai`).
  - [x] **Verification:** Run `pnpm dev` in `apps/functions` to ensure no startup crashes due to missing packages.

---

### Phase 2: Shared Domain Layer (TDD)

**Goal:** Define and validate the data contract.

- [x] **Chat & Ingestion Schemas**
  - [x] **🔴 Write Test:** Create `packages/shared/src/schemas/rag.test.ts`.
  - [x] **🟢 Implement:** Create `packages/shared/src/schemas/rag.ts` and export Zod schemas to satisfy the tests.
  - [x] **Refactor:** Export from `packages/shared/src/index.ts` and verify imports work.

---

### Phase 3: Backend Implementation (`apps/functions`)

**Goal:** Build the brain using unit tests for logic and mocks for external services.

- [ ] **Ingestion Logic (Chunking)**
- **🔴 Write Test:** Create `apps/functions/src/lib/ingest.test.ts`.
- Test `chunkText()`: Provide a 5000-char string and assert it returns array of strings < 1200 chars each.
- Test boundary conditions (empty string, exact 1200 chars).

- **🟢 Implement:** Write `chunkText` function in `apps/functions/src/lib/ingest.ts` using the double-newline split logic .

- [ ] **Vertex AI Adapter (Mocked)**
- **🔴 Write Test:** Create `apps/functions/src/lib/vertex.test.ts`.
- Mock `@google/genai` and `google-auth-library`.
- Test `embedTexts`: Assert it calls the SDK with `gemini-embedding-001` and returns vectors.
- Test `queryVectorSearch`: Assert it constructs the correct REST URL and payload.

- **🟢 Implement:** Write `embedTexts`, `queryVectorSearch`, and `upsertDatapoints` in `apps/functions/src/lib/vertex.ts`.

- [ ] **Ingestion Workflow (Integration Test)**
- **🔴 Write Test:** Add `ingestDocument` test to `ingest.test.ts`.
- Mock the `vertex` adapter and `firestore`.
- Assert that for 1 input doc:

1. Firestore `doc` is created.
2. Firestore `chunks` are created.
3. `vertex.upsertDatapoints` is called exactly once with correct IDs.

- **🟢 Implement:** Write `ingestDocument` orchestration logic in `ingest.ts`.

- [ ] **tRPC Router**
- **🔴 Write Test:** Create `apps/functions/src/trpc/routers/rag.test.ts`.
- Test `chat` procedure: Mock embedding/search/generation response. Call caller.rag.chat() and assert response matches `ChatResponseSchema`.
- Test `ingest` procedure: Assert it throws `UNAUTHORIZED` if user is not admin (mock context).

- **🟢 Implement:** Create `ragRouter` in `apps/functions/src/trpc/routers/rag.ts` and add logic.
- **Refactor:** Add `ragRouter` to `appRouter` in `router.ts`.

---

### Phase 4: Frontend Implementation (`apps/web`)

**Goal:** Build UI components that are verified to interact with the API correctly.

- [ ] **Chat Component Logic**
- **🔴 Write Test:** Create `apps/web/src/components/RAGChat.test.tsx`.
- Mock `trpc.rag.chat.useMutation`.
- Test: User types in input -> Click "Send" -> Mutation is fired with correct text.
- Test: Loading state disables the input/button.
- Test: Error state displays an error message.

- **🟢 Implement:** Create `RAGChat.tsx` using `@repo/ui` components (`Card`, `Button`, `Input`).

- [ ] **Chat Response Rendering**
- **🔴 Write Test:** Add to `RAGChat.test.tsx`.
- Mock a response with markdown text and 2 citations.
- Test: Assert markdown is rendered (e.g., look for specific HTML tags or classes).
- Test: Assert citations appear as footnotes/links.

- **🟢 Implement:** Update `RAGChat.tsx` to include `react-markdown` and citation rendering logic.

- [ ] **Admin Ingestion Page**
- **🔴 Write Test:** Create `apps/web/src/pages/Admin.test.tsx`.
- Test: Form validation (invalid URL shows error).
- Test: Submit calls `trpc.rag.ingest.useMutation`.
- Test: Success toast appears on resolution.

- **🟢 Implement:** Create `Admin.tsx` page.

---

### Phase 5: Verification & Launch

**Goal:** Confirm everything works together in the real world.

- [ ] **Local Integration Run**
- **Task:** Run `pnpm dev`.
- **Verification:**

1. Navigate to Admin page.
2. Ingest a small test URL (e.g., a NASA press release).
3. Check Firestore Emulator/Console: Do documents exist?
4. Go to Chat. Ask a question about that document.
5. **Success Criteria:** Answer is generated and correct citation ID is shown.

- [ ] **Deployment Pipeline Check**
- **Task:** Push to `dev` branch.
- **Verification:** Watch GitHub Actions `deploy-dev.yml` logs.
- **Success Criteria:** All steps (Build, Test, Authenticate, Deploy) pass green.

- [ ] **Smoke Test (Production/Stage)**
- **Task:** Ingest a real scientific paper PDF (via GCS trigger or URL).
- **Verification:** Ask "What is the primary conclusion of [Paper Title]?"
- **Success Criteria:** ORION AI answers accurately based _only_ on the new source.
