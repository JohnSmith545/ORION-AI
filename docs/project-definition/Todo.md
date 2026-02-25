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
- [x] **Redundancy Prevention**
  - [x] Implement `findNearest` distance-score return in `IVectorStore` and `FirestoreVectorStore`.
  - [x] Add similarity-threshold check (> 0.95) in `saveToFirestore` to skip semantically duplicate chunks.
- [x] **Batch Processing**
  - [x] Chunk Firestore batch writes into groups of 450.
  - [x] Batch Gemini embedding requests in groups of 100 to avoid payload limits.

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
- [x] **Telemetry Generation**
  - [x] Gemini system prompt generates structured telemetry (coordinates, distance, type, imageKeyword) for all astronomical topics.
  - [x] Telemetry schema supports general concepts with `N/A`/`UNIVERSAL` fallbacks.
- [x] **NASA Image Integration**
  - [x] Fetch celestial imagery from NASA Image Library API using telemetry `imageKeyword`.
  - [x] Wikipedia fallback for images when NASA returns no results.
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
  - [x] 🟢 Implement: `DashboardChatSection.tsx` — full message list with user/assistant roles, state management, typing indicator, auto-scroll, and chat history via tRPC mutation.
- [x] **Markdown Rendering**
  - [x] Custom `renderMarkdown()` — renders **bold**, bullet lists, numbered lists, and paragraphs.
- [x] **Citation System**
  - [x] Source links displayed under each assistant message in a "Sources" section with citation URIs from RAG responses.
- [x] **Admin Dash**
  - [x] `AdminIngestPanel` in `DashboardSidebarLeft.tsx` — URI input, title field, API/GCS source type selector, ingestion status/error feedback, and role-gated visibility (admin only).
- [x] **Multimodal Chat**
  - [x] File attachment support (PDFs & images) via Gemini `inlineData`.
  - [x] Frontend file upload UI with drag-and-drop / click-to-attach.
- [x] **Voice Input**
  - [x] Native Web Speech API (client-side) for voice-to-text input.
  - [x] Audio visualiser with red glow UI effect during dictation.
- [x] **AI Welcome Greeting**
  - [x] Female AI voice greeting ("Welcome to Orion A.I.") on first dashboard load using `speechSynthesis`.
  - [x] Session-gated to play once per session.
- [x] **3D Celestial Viewer**
  - [x] `Celestial3DViewer.tsx` — React Three Fiber component rendering rotating celestial bodies.
  - [x] Hybrid 3D/2D Holo-Target system on `DashboardSidebarRight.tsx` (3D spheres for planets/stars, NASA images for complex objects).
- [x] **Observatory Modal**
  - [x] `ObservatoryModal.tsx` — detailed telemetry display with NASA Archives link.
- [x] **Responsive Layout**
  - [x] Mobile-optimised dashboard — left/right sidebars hidden on small screens; chat fills available space.

---

### Phase 5: Security

**Goal:** Harden the application against common vulnerabilities.

- [x] **Firestore Security Rules**
  - [x] `docs` and `chunks` collections locked to `allow read, write: if false` (Admin SDK only).
  - [x] `users/{userId}` scoped to `request.auth.uid == userId`.
  - [x] `chatSessions` and `archiveFolders` owner-scoped with auth checks on read/write/create.
  - [x] Catch-all deny rule for all other paths.
- [x] **Security Audit**
  - [x] Comprehensive post-remediation audit covering backend, client-side, database rules, and dependency security.
- [ ] **Remaining Security Tasks**
  - [x] Add rate-limiting middleware — 50 req/min via `express-rate-limit` in `index.ts`.
  - [x] Implement SSRF protection for user-submitted URIs (HTTPS-only, private IP blocking).
  - [ ] Add file size limit to `ChatQuerySchema.files` base64 data (~10 MB max).
  - [ ] Add MIME type allowlist for file attachments (`image/png`, `image/jpeg`, `image/webp`, `application/pdf`).
  - [x] Add Content Security Policy (CSP) headers.
  - [ ] Set up automated dependency vulnerability scanning (`pnpm audit` in CI).

---

### Phase 6: Verification & Launch

**Goal:** Production readiness and quality assurance.

- [x] **Automated Testing**
  - [x] Task: Unit tests for adapters — `gemini.test.ts`, `ingest.test.ts`, `rag.test.ts`, `rag.test.ts` (router), `user.test.ts` (router), `rag.test.ts` (schema), `user.test.ts` (schema). _(Coverage may not be 100%.)_
  - [x] Task: Playwright E2E tests — auth flows (`auth.spec.ts`) and dashboard interactions (`dashboard.spec.ts`) with Firebase emulator fixtures.
- [x] **Observability**
  - [x] Task: Add structured logging for retrieval similarity scores and LLM latency.
- [ ] **Deployment**
  - [x] Deploy to production via GitHub Actions (`ci.yml`, `deploy-dev.yml`, `deploy-stage.yml`, `deploy-main.yml`, `release.yml`).
  - [ ] Final A11y and performance audit.
- [ ] **Performance Optimisation**
  - [ ] Lazy-load Cloud Functions to eliminate cold-start timeouts.
  - [ ] Implement connection pooling for Firestore.
