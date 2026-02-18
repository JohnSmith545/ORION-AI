Based on the **Product Design Document** and **Technical Design Document**, here is the comprehensive To-Do list for building ORION AI.

### Phase 1: Foundation & Infrastructure Setup

**Goal:** Prepare Google Cloud resources and configure the monorepo for AI integration.

- [ ] **GCP Project Configuration**
- Enable required APIs: `aiplatform.googleapis.com`, `firestore.googleapis.com`.

- Create **Vertex AI Vector Search Index**:
- Dimensions: `3072` (to match `gemini-embedding-001`).

- Update Method: `StreamUpdate` (for live ingestion).

- Deploy Index to a public Endpoint (to allow access from Cloud Functions).

- Create **Firestore Database** (Native mode) if not already present.

- [ ] **IAM & Security Configuration**
- Grant **Cloud Build Service Account** permissions:
- `roles/run.admin`, `roles/artifactregistry.repoAdmin`, `roles/logging.logWriter` .

- `roles/iam.serviceAccountUser` on the runtime service account.

- Grant **Runtime Service Account** (App Engine default or custom) permissions:
- `roles/aiplatform.user` (Vertex AI User).

- `roles/datastore.user` (Firestore access).

- `roles/storage.objectViewer` (for GCS ingestion).

- [x] **Monorepo Configuration**
- [x] Add secrets to GitHub/`.env`: `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `VECTOR_INDEX_ID`, `VECTOR_ENDPOINT_ID` .

- [x] Install backend dependencies in `apps/functions`:
- [x] `npm install @google/genai google-auth-library`.

---

### Phase 2: Shared Domain Layer

**Goal:** Establish a common language for Chat and Ingestion data types.

- [x] **Create Shared Schemas**
- [x] Create file: `packages/shared/src/schemas/rag.ts`.
- [x] Implement `ChatQuerySchema`: `{ question, history }`.
- [x] Implement `ChatResponseSchema`: `{ answer, citations }`.
- [x] Implement `IngestDocSchema`: `{ sourceUri, sourceType, title }`.
- [x] Export these schemas in `packages/shared/src/index.ts`.

---

### Phase 3: Backend Implementation (`apps/functions`)

**Goal:** Implement the "Brain" (AI logic) and "Spine" (API layer).

- [ ] **Vertex AI Adapter (`src/lib/vertex.ts`)**
- Implement `getAuthClient()` using `google-auth-library` for server-side ADC .

- Implement `embedTexts(texts)` using `@google/genai` with `gemini-embedding-001` .

- Implement `queryVectorSearch(vector)` using the REST API (`indexEndpoints.findNeighbors`) to minimize latency .

- Implement `upsertDatapoints(datapoints)` for the ingestion pipeline .

- [ ] **Ingestion Logic (`src/lib/ingest.ts`)**
- Implement `chunkText(text)`: Split by double newlines/headings, capped at ~1200 characters.

- Implement `ingestDocument` flow:

1. Fetch content from URL/GCS.
2. Generate chunks.
3. Batch generate embeddings.
4. Transactionally save to Firestore (`docs` + `chunks` collections) .

5. Upsert vectors to Vertex AI.

- [ ] **tRPC Router (`src/trpc/routers/rag.ts`)**
- Create `ragRouter`.
- Implement `ingest` mutation (protected by admin check).
- Implement `chat` mutation:

1. Embed input question.
2. Search vectors.
3. Hydrate context from Firestore.

4. Construct "Grounded Generation" prompt .

5. Call Gemini `generateContent`.

- Add `ragRouter` to the main `appRouter`.

---

### Phase 4: Frontend Implementation (`apps/web`)

**Goal:** Build the user interface for research and administration.

- [ ] **Admin Ingestion Interface**
- Create page `src/pages/Admin.tsx` (or similar).
- Add a form using `IngestDocSchema` to accept Source URIs.
- Connect to `trpc.rag.ingest.useMutation`.

- [ ] **Chat Component (`src/components/RAGChat.tsx`)**
- Scaffold UI using `@repo/ui` components (`Card`, `Button`, `Input`).
- Manage state for `messages` and `isLoading`.
- Connect to `trpc.rag.chat.useMutation`.
- Render Markdown responses and display citations (footnotes) from the response data.

---

### Phase 5: Verification & Launch

**Goal:** Ensure reliability and deploy.

- [ ] **Local Testing**
- Run `pnpm test` to verify schema validation and chunking logic.
- Use `pnpm dev` to run the frontend and test the full flow with the local emulator (if configured) or dev environment.

- [ ] **Deployment**
- Push code to `dev` branch to trigger `deploy-dev.yml`.
- Verify Cloud Functions deployment logs for IAM errors.
- Perform a live test: Ingest a NASA/ESA document and ask a specific question to verify grounding.
