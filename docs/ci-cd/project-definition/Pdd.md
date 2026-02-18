# Product Design: Vertex AI RAG Chatbot Integration

## 1. Executive Summary

We are building a Retrieval-Augmented Generation (RAG) Chatbot integrated into the **Orion AI** monorepo. It will allow users to ask questions against a knowledge base stored in **Firestore** and indexed in **Vertex AI Vector Search** .

- **Goal:** Provide accurate, cited answers using **Gemini 2.5 Flash**.
- **Key Constraint:** Minimize costs by avoiding "always-on" RAG engines; use **Vector Search + Cloud Functions** instead.
- **Stack:** React (Frontend), tRPC (API Layer), Firebase Cloud Functions (Backend), Vertex AI (Embeddings/LLM) .

---

## 2. System Architecture

We will adapt the PDF's architecture to your monorepo structure:

| Logical Component | PDF Recommendation

| Orion AI Monorepo Location |
| -------------------------- | ------------------------ | --------------------------------------------- |
| **Frontend**               | React + Firebase Hosting | `apps/web` (Vite + React)                     |
| **API Layer**              | Firebase Cloud Functions | `apps/functions` (tRPC Router)                |
| **LLM Orchestration**      | Node.js / TypeScript     | `apps/functions/src/lib/rag.ts` (New Service) |
| **Vector DB**              | Vertex AI Vector Search  | External GCP Service (Connect via REST/SDK)   |
| **Document Store**         | Firestore                | External Firebase (Native Integration)        |
| **SDK**                    | `@google/genai`          | Add to `apps/functions/package.json`          |

---

## 3. Data Model Design

### A. Firestore Schema (Source of Truth)

We will follow the "Data model" section of the guide , strictly typed in your codebase.

- **Collection:** `docs`
- `id`: `string` (Auto-ID)
- `sourceType`: `"gcs" | "api"`
- `sourceUri`: `string`
- `title`: `string`
- `createdAt`: `Timestamp`

- **Sub-collection:** `docs/{docId}/chunks`
- `id`: `string` (Chunk Index, e.g., `0001`)
- `text`: `string` (The actual content)
- `vectorDatapointId`: `string` (Link to Vector Search, e.g., `{docId}_{chunkId}`)

### B. Vector Search Schema

- **Dimensions:** 3072 (using `gemini-embedding-001` as per guide).
- **Metadata:** Minimal storage (`docId`, `chunkId`) to keep index size low.

---

## 4. Component Design

### Layer 1: Shared Domain (`packages/shared`)

Define the "Language" of your RAG system here so both Frontend and Backend speak the same types.

**File:** `packages/shared/src/schemas/rag.ts`

```typescript
import { z } from 'zod'

// Input for the Chat Interface
export const ChatQuerySchema = z.object({
  question: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        text: z.string(),
      })
    )
    .optional(), // For multi-turn context
})

// Output for the Chat Interface
export const ChatResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(
    z.object({
      docId: z.string(),
      title: z.string(),
      uri: z.string().optional(),
      similarity: z.number().optional(),
    })
  ),
})

// Input for Ingestion (Admin only)
export const IngestDocSchema = z.object({
  sourceUri: z.string().url(),
  sourceType: z.enum(['gcs', 'api']),
  title: z.string().optional(),
})
```

### Layer 2: Backend Logic (`apps/functions`)

This replaces the "raw" Cloud Functions in the PDF with organized tRPC procedures.

**File:** `apps/functions/src/lib/vertex.ts` (The "Adapter")

- Implement `embedTexts(texts: string[])` using `@google/genai`.
- Implement `queryVectorSearch(vector: number[])` using the REST API.
- _Note:_ Using REST for Vector Search is cheaper/easier than the full GRPC client for simple queries.

**File:** `apps/functions/src/trpc/routers/rag.ts` (The Router)

- **Procedure:** `chat`
- **Input:** `ChatQuerySchema`
- **Logic:**

1. Check Auth (User must be logged in).
2. `embedTexts(input.question)`.
3. `queryVectorSearch()` to get IDs.
4. Fetch actual text chunks from Firestore (using the IDs) .

5. Construct Prompt: `"Context: {chunks} ... Question: {question}"` .

6. Call Gemini `generateContent`.

- **Output:** `ChatResponseSchema`.

- **Procedure:** `ingest`
- **Input:** `IngestDocSchema`
- **Logic:**

1. Check Admin Auth (Strict!).
2. Fetch content from `sourceUri`.
3. Split content into chunks (max 1000 chars overlap).
4. Save doc and chunks to Firestore.
5. Generate embeddings for chunks.
6. Upsert vectors to Vertex AI.

### Layer 3: Frontend Experience (`apps/web`)

Build a clean interface using your existing Shadcn components.

- **Component:** `RAGChat.tsx`
- **State:** `messages[]`, `isLoading`.
- **Hooks:** `trpc.rag.chat.useMutation()`.
- **UI:**
- Use `<Card>` for the chat window.
- Use `<ScrollArea>` (if available) or standard div for message history.
- Render "Citations" as small footnotes below the AI response.

---

## 5. Development Workflow (Step-by-Step)

### Phase A: Foundation (Infrastructure)

1. **GCP Setup:**

- Enable Vertex AI API.
- Create a Vector Search Index (StreamUpdate type is best for live ingestion).
- Deploy Index to an Endpoint (Public endpoint is easiest for Cloud Functions).

2. **Repo Config:**

- Add `@google/genai` to `apps/functions`.
- Update `.env` with `GOOGLE_CLOUD_PROJECT`, `VECTOR_INDEX_ID`, `VECTOR_ENDPOINT_ID`.

### Phase B: The "Ingest" Pipeline

_Why first? You can't chat with an empty brain._

1. Create `ingest` procedure in tRPC.
2. Create a temporary "Admin Test Page" in `apps/web`.
3. Run a test ingestion of a simple text file.
4. **Verify:** Check Firestore for chunks and GCP Console for Vector Index counts.

### Phase C: The "Retrieval" Pipeline

1. Implement `embedTexts` and `queryVectorSearch`.
2. Create a test script (or vitest test) in `apps/functions` that sends a query vector and asserts it gets the ID of the doc you just ingested.

### Phase D: The "Generation" Pipeline

1. Connect the `chat` procedure.
2. Construct the system prompt ("Answer using ONLY the provided sources...").
3. Build the frontend Chat UI.

---

## 6. Security & Cost Controls

### Cost Safety

- **Vector Search:** This is the main fixed cost (~$70-$100/mo).
- **Action:** Delete the endpoint when not actively developing if this is a hobby project.

- **Gemini:** Pay-per-character.
- **Action:** Use `gemini-2.5-flash` for high speed and low cost.

### Security

- **Ingestion:** Must be protected by `ctx.user.role === 'admin'`.
- **Vector Search:** Do not expose the Vector Search endpoint to the public internet; only your Cloud Functions (Backend) should talk to it.
- **API Keys:** Do not commit Service Account keys. Use the existing Workload Identity Federation (WIF) set up in your repo.
