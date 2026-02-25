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

| Component           | Technology          | Monorepo Location                                         | Description                                         |
| :------------------ | :------------------ | :-------------------------------------------------------- | :-------------------------------------------------- |
| **Shared Domain**   | Zod                 | `packages/shared/src/schemas/rag.ts`                      | RAG, telemetry, session, and ingestion schemas.     |
| **User Schemas**    | Zod                 | `packages/shared/src/schemas/user.ts`                     | User, archive folder, and session management types. |
| **Frontend UI**     | React               | `apps/web/src/components/dashboard/*.tsx`                 | Dashboard with chat, sidebar, 3D viewer, modals.    |
| **3D Viewer**       | React Three Fiber   | `apps/web/src/components/dashboard/Celestial3DViewer.tsx` | Interactive rotating celestial body renderer.       |
| **Auth UI**         | React               | `apps/web/src/features/auth/components/*.tsx`             | Login, signup, auth layout.                         |
| **API Layer**       | tRPC                | `apps/functions/src/trpc/routers/rag.ts`                  | RAG chat + ingestion procedures.                    |
| **User API**        | tRPC                | `apps/functions/src/trpc/routers/user.ts`                 | Profile, sessions, archives, history.               |
| **Auth Middleware** | tRPC Middleware     | `apps/functions/src/trpc/trpc.ts`                         | `protectedProcedure` + `adminProcedure`.            |
| **Model Adapter**   | **`@google/genai`** | `apps/functions/src/lib/gemini.ts`                        | Vertex AI adapter (embeddings + generation).        |
| **Vector Port**     | `IVectorStore`      | `apps/functions/src/ports/vector-store.ts`                | Hexagonal Port interface.                           |
| **Vector Adapter**  | Firestore           | `apps/functions/src/lib/firestore-vector-store.ts`        | Firestore kNN with distance scoring.                |
| **Ingestion**       | Node.js             | `apps/functions/src/lib/ingest.ts`                        | Fetch → chunk → embed → deduplicate → batch-save.   |

---

## 3. Data Architecture (Utilizing Vertex AI & Firestore)

### 3.1 Intelligence Layer (Vertex AI)

- **Embeddings:** `text-embedding-004` (3072 dimensions), batched in groups of 100.
- **Generation:** `gemini-2.5-flash` for high-speed, cited responses with structured output.
- **Structured Output Schema:**
  - `text` — conversational response
  - `telemetry` — celestial object data (name, type, RA, Dec, distance, description, imageKeyword)
  - `usedSources` — array of 1-based context indices for citation mapping
  - `contextIsRelevant` — boolean flag indicating if RAG context was useful

### 3.2 Storage Layer

We utilize Firestore's native vector support for scalable semantic retrieval.

- **Method:** `db.collectionGroup('documentChunks').findNearest('embedding', queryVector, { limit: 5, distanceMeasure: 'COSINE', distanceResultField: 'vector_distance' })`.
- **Deduplication:** Cosine distance < 0.05 threshold to prevent redundant chunk storage.
- **Batch Writes:** Firestore writes chunked in groups of 450 (safety margin below 500-op limit).

### 3.3 Multimodal Data Flow

- Client encodes files (PDF/image) as base64 strings.
- Passed through `ChatQuerySchema.files` array to tRPC procedure.
- Backend sends to Gemini via `inlineData` parts alongside the text query.

---

## 4. API Design (tRPC)

The `ragRouter` orchestrates the flow while remaining agnostic to the specific vector storage implementation.

### 4.1 RAG Procedures

- **`chat` (protectedProcedure):**

  1. Validate input with `ChatQuerySchema` (question, optional history, optional files).
  2. Call Vertex AI to embed query text.
  3. Query the `IVectorStore` (Firestore implementation) for top-3 context chunks.
  4. Call Vertex AI (Gemini) for context-aware generation with multi-turn history and file attachments.
  5. If telemetry contains `imageKeyword`, fetch imagery from NASA Image Library → Wikipedia fallback.
  6. Build citations from Gemini's `usedSources` indices.
  7. Return: `{ response, citations, telemetry }`.

- **`ingest` (adminProcedure):**
  1. Validate input with `IngestDocSchema` (sourceUri, sourceType, title).
  2. Fetch content (HTTPS or GCS) with SSRF protection.
  3. Chunk document (max 1000 chars, 200 overlap).
  4. Call Vertex AI to batch embed chunks (groups of 100).
  5. Deduplicate against existing vectors (cosine distance < 0.05).
  6. Store text and vectors in Firestore (batches of 450).

### 4.2 User Procedures

- **`getMe`**, **`getChatHistory`**, **`createSession`**, **`getSession`**, **`deleteSession`**, **`addMessages`**, **`clearHistory`**
- **Archive:** `createFolder`, `renameFolder`, `deleteFolder`, `archiveSession`, `unarchiveSession`, `getArchivedSessions`

---

## 5. Development Roadmap (TDD Focus)

### Phase 1: Shared Domain & Configuration

1. **Red:** Write tests for `rag.ts` and `user.ts` schemas.
2. **Green:** Implement schemas and export them.

### Phase 2: Vertex AI Model Adapters

1. **Red:** Unit tests for `embedTexts` and `generateGroundedResponse` (mocking `@google/genai`).
2. **Green:** Implement `gemini.ts` utilizing the `@google/genai` SDK with Vertex AI backend.

### Phase 3: RAG Core & Integration

1. **Red:** Integration test for the Chat flow, ingestion pipeline, and deduplication.
2. **Green:** Implement `ragRouter`, ingestion pipeline, and `DashboardChatSection` component.

### Phase 3.5: Authentication & Security Middleware

1. Implement Firebase Auth integration (email/password + Google sign-in).
2. Build `protectedProcedure` and `adminProcedure` tRPC middleware.
3. Write Firestore security rules (owner-scoped, deny-by-default).

### Phase 4: Frontend Features

1. Multimodal file attachments, voice input, 3D viewer, observatory modal, responsive layout.
2. AI welcome greeting, admin ingestion panel, chat history management.

### Phase 5: Security Hardening

1. SSRF protection in ingestion pipeline.
2. Input validation via Zod schemas on all tRPC procedures.
3. Firestore security rules audit.
4. Comprehensive security audit and threat modelling.

---

## 6. Security & Infrastructure

- **Authentication:** Firebase Auth with email/password + Google sign-in.
- **Authorisation:** Role-based (`admin`/`user`) via Firestore user documents, enforced by `isAuthed` → `isAdmin` tRPC middleware chain.
- **Firestore Rules:** Owner-scoped collections (`users`, `chatSessions`, `archiveFolders`), deny-all for `docs`/`chunks` (Admin SDK only), catch-all deny.
- **SSRF Protection:** HTTPS-only ingestion, blocked private/internal IPs (RFC 1918, link-local, GCP metadata endpoint).
- **Input Validation:** Zod schemas with `.min()`, `.max()`, `.refine()` on all procedure inputs.
- **IAM:** Deploy with `aiplatform.user` and `datastore.user` roles.
- **WIF:** Secure, keyless authentication via Workload Identity Federation.
