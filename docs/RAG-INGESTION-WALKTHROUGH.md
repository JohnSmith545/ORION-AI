# RAG Chatbot & Data Ingestion Walkthrough

This guide explains how the ORION AI RAG (Retrieval-Augmented Generation) chatbot is wired end-to-end and how to ingest data from your data sources into the app.

---

## 1. Architecture overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend (apps/web)                                                     │
│  • Dashboard chat: user types question → tRPC rag.chat                   │
│  • Left sidebar "Ingest data": source URI + type → tRPC rag.ingest       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ tRPC (HTTP)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Backend (apps/functions)                                                │
│  • rag.chat: embed query → Firestore vector search → Gemini → response  │
│  • rag.ingest: fetch content → chunk → embed → save to Firestore         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   Firestore (docs + chunks)   Vertex AI (embeddings)   Vertex AI (Gemini)
   vector index on chunks      text-embedding-004       gemini-2.5-flash
```

- **Chat:** User question is embedded, nearest chunks are retrieved from Firestore, then Gemini generates an answer grounded in that context. Citations point to source URIs.
- **Ingest:** You provide a **source URI** (URL or GCS path). The backend fetches the content, chunks it, generates embeddings via Vertex AI, and stores chunks + vectors in Firestore.

---

## 2. Prerequisites

Before the RAG chatbot and ingestion work end-to-end you need:

1. **Backend running**  
   The web app calls `VITE_API_URL` (default `http://localhost:5001/api/trpc`). Your tRPC API must be served at that URL (e.g. Cloud Functions or a local Express server that mounts the tRPC handler).

2. **Firebase / Firestore**

   - Firestore is used for:
     - **Ingestion:** `docs` collection (metadata) and `docs/{id}/chunks` (text + embedding vectors).
     - **Retrieval:** Vector search over the `chunks` collection group.
   - You must create a **vector index** on the `embedding` field of the collection group used for search (see your TDD/Firestore docs). Dimension must match your embedding model (e.g. **3072** for `text-embedding-004`).

3. **Vertex AI**

   - **Embeddings:** e.g. `text-embedding-004` (used in `apps/functions/src/lib/gemini.ts`).
   - **Chat:** e.g. `gemini-2.5-flash` for grounded generation.
   - Service account used by the backend must have Vertex AI and Firestore permissions.

4. **Environment variables (backend)**
   - `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`
   - Optional: `EMBEDDING_MODEL`, `CHAT_MODEL`
   - Firebase Admin / Application Default Credentials so the function can access Firestore and Vertex AI.

---

## 3. Running the backend

- **Local:** Run your tRPC server (e.g. Express or Firebase emulator) so it listens on the URL used by the web app (e.g. `http://localhost:5001/api/trpc`).
- **Deployed:** Deploy the function that exposes the tRPC router (e.g. `api/trpc` on Cloud Functions). Set `VITE_API_URL` in the web app to that base URL.

The app router is in `apps/functions/src/trpc/router.ts` and mounts `rag.chat` and `rag.ingest`.

---

## 4. Ingesting data into the app

Ingestion adds documents to your knowledge base so the chatbot can retrieve and cite them.

### 4.1 Supported sources

| sourceType | sourceUri format                | Description                                                                                                                                |
| ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `api`      | `https://...` or `http://...`   | Fetched via HTTP. Use for public URLs returning **plain text** (e.g. `.txt`, or an API that returns text).                                 |
| `gcs`      | `gs://bucket-name/path/to/file` | Fetched from Google Cloud Storage. Backend uses Firebase Admin Storage. Best for in-project files (PDFs, text, etc.) once you add parsing. |

- **API:** Backend calls `fetchContent(url)` in `apps/functions/src/lib/ingest.ts` and uses `response.text()`. So the URL should return **text** (HTML/XML will be stored as raw text; for strict text, use a URL that serves plain text).
- **GCS:** Backend uses `fetchFromGCS(gsUri)` and reads the object as UTF-8 text. For binary formats (e.g. PDF) you would extend the pipeline to parse and extract text before chunking.

### 4.2 Ingest from the dashboard (UI)

1. Open the **Dashboard** (e.g. `/dashboard`).
2. In the **left sidebar**, find the **“Ingest data”** section.
3. **Source URI:**
   - For a web page or API: choose **API** and enter a URL, e.g. `https://example.com/doc.txt`.
   - For GCS: choose **GCS** and enter a URI, e.g. `gs://your-bucket/path/to/file.txt`.
4. **Title (optional):** Human-readable name for the document.
5. Click **Ingest**. The backend will:
   - Fetch the content,
   - Split it into chunks (size 1000, overlap 200),
   - Generate embeddings (Vertex AI),
   - Write to Firestore (`docs` + `docs/{id}/chunks` with vector index on `embedding`).

Success shows the new document ID; errors appear below the button.

### 4.3 Ingest programmatically (tRPC)

You can call the ingest procedure from any tRPC client (e.g. script or another app):

```ts
// Example: ingest a public URL
await trpc.rag.ingest.mutate({
  sourceUri: 'https://example.com/faq.txt',
  sourceType: 'api',
  title: 'FAQ',
})

// Example: ingest from GCS
await trpc.rag.ingest.mutate({
  sourceUri: 'gs://my-bucket/data/manual.txt',
  sourceType: 'gcs',
  title: 'User manual',
})
```

Validation (in `packages/shared/src/schemas/rag.ts`):

- `sourceType: 'gcs'` → `sourceUri` must start with `gs://`.
- `sourceType: 'api'` → `sourceUri` must be `http://` or `https://`.

### 4.4 Adding new data sources (e.g. PDF, Confluence)

Current pipeline expects **text**:

- **API:** `fetchContent` returns `response.text()`. For HTML, you could add a step to strip tags or use a library to get plain text.
- **GCS:** `fetchFromGCS` returns `contents.toString('utf-8')`. For PDFs:
  - Add a dependency (e.g. `pdf-parse` or Google Document AI) in `apps/functions`.
  - In `ingestDocument`, after fetching the buffer, detect type by path or Content-Type, run a PDF extractor, then pass the extracted text into `chunkText` and the rest of the flow.

Same pattern applies for other sources: implement a fetcher that returns **string** (or buffer + type), then normalize to text before chunking and embedding.

---

## 5. How the RAG chat works

1. **User sends a message** in the dashboard. The frontend calls `trpc.rag.chat.mutate({ question, history })`.
2. **Backend (`rag.chat`):**
   - Embeds `question` with Vertex AI (`getQueryEmbedding`).
   - Runs vector search on Firestore (`retrieveContext`) to get the top-k chunks (e.g. 5) by cosine similarity.
   - Builds a prompt with that context and calls Gemini (`generateGroundedResponse`) to produce an answer.
   - Returns `{ response, citations }` (citations = source URIs of the retrieved chunks).
3. **Frontend** appends the assistant message and, when present, shows **Sources** (citations) under the bubble.

So the “data source” for the chatbot is **whatever has already been ingested** into Firestore via `rag.ingest`. Ingest first, then ask questions; the model will only use and cite that stored content.

---

## 6. File reference

| Purpose                               | Location                                                     |
| ------------------------------------- | ------------------------------------------------------------ |
| RAG API (chat + ingest)               | `apps/functions/src/trpc/routers/rag.ts`                     |
| Shared schemas (ChatQuery, IngestDoc) | `packages/shared/src/schemas/rag.ts`                         |
| Fetch, chunk, save to Firestore       | `apps/functions/src/lib/ingest.ts`                           |
| Query embedding + retrieval           | `apps/functions/src/lib/rag.ts`                              |
| Vector search implementation          | `apps/functions/src/lib/firestore-vector-store.ts`           |
| Embeddings + Gemini                   | `apps/functions/src/lib/gemini.ts`                           |
| Dashboard chat (calls RAG)            | `apps/web/src/components/dashboard/DashboardChatSection.tsx` |
| Ingest form (sidebar)                 | `apps/web/src/components/dashboard/DashboardSidebarLeft.tsx` |
| tRPC client + base URL                | `apps/web/src/lib/trpc.ts` (uses `VITE_API_URL`)             |

---

## 7. Quick checklist

- [ ] Backend running and reachable at `VITE_API_URL`.
- [ ] Firestore vector index created on the `embedding` field (dimension = embedding model size).
- [ ] Vertex AI enabled; embedding and chat models configured; credentials in place.
- [ ] Ingest at least one document (API URL or GCS) via dashboard or tRPC.
- [ ] Ask a question in the dashboard chat; answer should be grounded in ingested content and show sources when available.

For more detail on the pipeline and costs, see `docs/project-definition/vertex-ai-rag-guide.md` and `docs/project-definition/Tdd.md`.
