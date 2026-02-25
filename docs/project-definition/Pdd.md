# Product Design: Vertex AI RAG Chatbot Integration

## 1. Executive Summary

ORION AI is a Retrieval-Augmented Generation (RAG) platform designed to showcase the power of **Vertex AI** and **Google Cloud**. This system enables accurate, cited interactions with custom knowledge bases by utilizing Vertex AI's state-of-the-art models for both semantic understanding and text generation.

- **Goal:** Utilize **Vertex AI** (Gemini 2.5 Flash & text-embedding-004) to provide high-quality RAG capabilities.
- **Architecture:** A serverless RAG implementation leveraging **Firestore Native Vector Search** for scalable, efficient semantic retrieval.
- **Enterprise Path:** The architecture is designed to scale to **Vertex AI Vector Search** for production-grade, sub-millisecond requirements.

---

## 2. System Architecture (The Vertex AI Stack)

The architecture prioritizes Vertex AI for intelligence while maintaining serverless efficiency:

| Component             | Technology                           | Role                                         |
| :-------------------- | :----------------------------------- | :------------------------------------------- |
| **Embeddings**        | **Vertex AI (`text-embedding-004`)** | Semantic vector generation.                  |
| **Generation**        | **Vertex AI (`Gemini 2.5 Flash`)**   | Context-aware answer generation.             |
| **Vector Search**     | **Firestore (Native Vector Search)** | Serverless semantic retrieval.               |
| **API Layer**         | tRPC + Cloud Functions               | Type-safe orchestration.                     |
| **Doc Store**         | Firestore                            | Persistent metadata and text storage.        |
| **Authentication**    | Firebase Authentication              | Email/password & Google sign-in.             |
| **Celestial Imagery** | NASA Image Library API               | Dynamic imagery for astronomical objects.    |
| **Voice Input**       | Web Speech API (client-side)         | Voice-to-text dictation for chat queries.    |
| **3D Rendering**      | React Three Fiber                    | Interactive 3D celestial body visualisation. |

---

## 3. Data Model Design

### A. Document Schema

We store text and vectors together in Firestore documents to enable atomic ingestion and simplified retrieval.

- **Collection:** `docs`

  - `id`: Auto-ID
  - `title`: `string`
  - `sourceUri`: `string`
  - `createdAt`: `Timestamp`

- **Sub-collection:** `docs/{docId}/chunks`
  - `text`: The text chunk (~1000 chars)
  - `embedding`: `vector` (3072 dimensions, kNN indexed)
  - `sourceUri`: Denormalized for single-read retrieval

### B. Retrieval Strategy

- **Search:** Use Firestore's `findNearest()` to fetch the top-k most relevant chunks.
- **Deduplication:** Cosine distance scoring (threshold < 0.05) prevents redundant chunks at ingestion time.
- **Batch Processing:** Firestore writes in groups of 450; Gemini embeddings in groups of 100.

### C. User & Session Data

- **Collection:** `users/{userId}` — Profile, role (admin/user).
- **Collection:** `chatSessions/{sessionId}` — Owner-scoped chat sessions with message history.
- **Collection:** `archiveFolders/{folderId}` — Owner-scoped archive folders.

---

## 4. Component Design

### Layer 1: Shared Domain (`packages/shared`)

Type-safe schemas (`ChatQuerySchema`, `ChatResponseSchema`, `TelemetrySchema`, `IngestDocSchema`, `SessionMessageSchema`, `UserSchema`) ensure consistency across the monorepo.

### Layer 2: Backend Logic (`apps/functions`)

- **Adapter (`gemini.ts`):** Wraps embedding generation, LLM calls, and structured Gemini output (text + telemetry + source citations).
- **Router (`rag.ts`):** Orchestrates the RAG flow: `Embed Query -> Firestore kNN -> Generate Answer -> Fetch NASA/Wikipedia imagery`.
- **Router (`user.ts`):** Manages user profiles, chat sessions, and archive folders.
- **Ingestion (`ingest.ts`):** Fetch → chunk → embed → deduplicate → batch-save pipeline with SSRF protection.
- **Port (`vector-store.ts`):** Hexagonal `IVectorStore` interface for storage backend abstraction.

### Layer 3: Frontend Interface (`apps/web`)

A modern, responsive chat UI featuring:

- Markdown rendering for AI responses with citation footnotes.
- **Multimodal chat:** File attachments (PDFs & images) passed to Gemini via `inlineData`.
- **Voice input:** Native Web Speech API dictation with audio visualiser and red glow effect.
- **3D Celestial Viewer:** React Three Fiber rotating celestial bodies with hybrid 3D/2D Holo-Target system.
- **Observatory Modal:** Detailed telemetry display with NASA Archives link-out.
- **AI Welcome Greeting:** Session-gated female AI voice greeting via `speechSynthesis`.
- **Responsive layout:** Mobile-optimised with collapsible sidebars.
- **Lazy-loaded pages:** Code-split with `React.lazy()` for Lighthouse performance.

### Layer 4: Security & Access Control

- **Firebase Authentication:** Email/password + Google sign-in with `PrivateRoute` guards.
- **tRPC Middleware:** `protectedProcedure` (requires valid UID) and `adminProcedure` (requires Firestore `role === 'admin'`).
- **Firestore Rules:** Owner-scoped access, catch-all deny, Admin SDK bypass for ingestion.
- **SSRF Protection:** HTTPS-only ingestion with blocked private/internal IP ranges.

---

## 5. Test-Driven Development (TDD) Strategy

To ensure "Level 5" quality, we adopt a strict TDD lifecycle:

1. **Red Stage:** Draft failing tests for Vertex AI API interactions and data transformations.
2. **Green Stage:** Implement minimum logic to fulfill the AI requirements.
3. **Refactor Stage:** Clean code to maintain Hexagonal decoupling.

---

## 6. Implementation Phases

### Phase 1: Foundation & Project Setup

Initialize Google Cloud project, enable necessary APIs (Vertex AI, Firestore), and finalize monorepo configuration including shared schemas and type definitions.

### Phase 2: Ingestion Pipeline

Implement the document processing flow: fetching content, chunking text, generating embeddings via Vertex AI, storing vectors in Firestore, deduplication via cosine similarity, and batch processing for scale.

### Phase 3: RAG Retrieval & Generation

Develop the core conversational logic: embedding user queries, performing kNN search in Firestore, generating grounded responses using Gemini 2.5 Flash with structured telemetry output, and fetching celestial imagery from NASA/Wikipedia APIs.

### Phase 3.5: Authentication & User Management

Secure user access with Firebase Authentication (email/password + Google sign-in), implement auth pages and layout, route guards, and session management.

### Phase 4: Frontend Development

Build the premium chat interface with multimodal file attachments, voice input, 3D celestial viewer, observatory modal, AI welcome greeting, admin ingestion panel, and mobile-responsive layout.

### Phase 5: Security

Harden the application with Firestore security rules, SSRF protection, auth middleware, input validation via Zod, admin role-gating, and comprehensive security auditing.

### Phase 6: Verification & Launch

Execute comprehensive testing (Vitest, Playwright), perform A11y and performance audits, and deploy to Cloud Functions via the CI/CD pipeline.

---

## 7. Security & Observability

- **Authentication:** Firebase Auth with email/password and Google sign-in, enforced by tRPC middleware chain (`isAuthed` → `isAdmin`).
- **Authorisation:** Role-based access via Firestore user documents (`admin` / `user`).
- **Firestore Rules:** Owner-scoped collections, deny-by-default catch-all, Admin SDK bypass for ingestion.
- **SSRF Protection:** HTTPS enforcement, blocked private IP ranges (RFC 1918, link-local, GCP metadata).
- **Input Validation:** Zod schemas with `.min()`, `.max()`, and `.refine()` on all tRPC inputs.
- **IAM:** Deploy with `aiplatform.user` and `datastore.user` roles.
- **WIF:** Secure, keyless authentication via Workload Identity Federation.
- **Monitoring:** Implement structured logging and custom metrics to track RAG performance and model latency.
