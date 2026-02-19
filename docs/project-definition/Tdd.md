# Technical Design Document: ORION AI

## 1. Introduction

This document outlines the technical implementation for **ORION AI**, a Retrieval-Augmented Generation (RAG) system integrated into the existing Hytel monorepo stack. It translates the functional requirements from the Product Design Document into concrete engineering tasks, leveraging the existing architecture of React, tRPC, and Firebase Cloud Functions.

## 2. System Architecture

ORION AI will be implemented as a new feature module within the existing monorepo structure.

### 2.1 Component Mapping

| Component         | Technology     | Location in Monorepo                     | Description                                          |
| ----------------- | -------------- | ---------------------------------------- | ---------------------------------------------------- |
| **Shared Domain** | Zod            | `packages/shared/src/schemas/rag.ts`     | Shared validation schemas for Chat & Ingestion.      |
| **Frontend UI**   | React + Shadcn | `apps/web/src/components/RAGChat.tsx`    | Chat interface using existing UI package components. |
| **API Layer**     | tRPC           | `apps/functions/src/trpc/routers/rag.ts` | Type-safe endpoints for `chat` and `ingest`.         |
| **Backend Logic** | Node.js        | `apps/functions/src/lib/vertex.ts`       | Adapter for Vertex AI SDK (Embeddings).              |
| **Vector Store**  | Firestore      | Google Cloud Platform                    | Native Vector Search (kNN) on documents.             |

|
| **Doc Store** | Firestore | Google Cloud Platform | External managed service (Native mode) .
|

---

## 3. Data Architecture

### 3.1 Firestore Schema

- **`docs` Collection**

  - `id`: `string` (UUID)
  - `sourceType`: `'gcs' | 'api'`
  - `sourceUri`: `string`
  - `title`: `string`
  - `createdAt`: `Timestamp`

- **`docs/{docId}/chunks` Sub-collection**
  - `id`: `string` (Sequential index, e.g., "0001")
  - `text`: `string` (Max ~1000 chars)
  - `embedding`: `vector` (3072 dimensions)

### 3.2 Vector Search Index

- **Model**: `gemini-embedding-001`
- **Dimensions**: 3072
- **Storage**: Firestore Native Vector Index (Composite).

---

## 4. API Design (tRPC)

We will extend the existing `appRouter` in `apps/functions`.

### 4.1 Shared Schemas

**Location**: `packages/shared/src/schemas/rag.ts`

```typescript
import { z } from 'zod'

export const ChatQuerySchema = z.object({
  question: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        text: z.string(),
      })
    )
    .optional(),
})

export const ChatResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(
    z.object({
      docId: z.string(),
      title: z.string(),
      uri: z.string().optional(),
    })
  ),
})

export const IngestDocSchema = z.object({
  sourceUri: z.string().url(),
  sourceType: z.enum(['gcs', 'api']),
  title: z.string().optional(),
})
```

### 4.2 Router Implementation

**Location**: `apps/functions/src/trpc/routers/rag.ts`

```typescript
import { router, publicProcedure } from '../trpc'
import { ChatQuerySchema, ChatResponseSchema, IngestDocSchema } from '@repo/shared'
// Import adapters...

export const ragRouter = router({
  chat: publicProcedure
    .input(ChatQuerySchema)
    .output(ChatResponseSchema)
    .mutation(async ({ input, ctx }) => {
      // 1. Generate Embedding
      const queryVector = await embedText(input.question)

      // 2. Vector Search (Combined Search & Context Retrieval)
      const context = await searchFirestoreVector(queryVector)

      // 3. Generate Response
      const response = await generateAnswer(input.question, context)

      return response
    }),

  ingest: publicProcedure.input(IngestDocSchema).mutation(async ({ input, ctx }) => {
    // Admin check logic here...
    return await ingestDocument(input)
  }),
})
```

---

## 5. Backend Implementation Details

### 5.1 Vertex AI Adapter (Embeddings)

**Location**: `apps/functions/src/lib/vertex.ts`

This module wraps the `@google/genai` SDK to handle authentication and model interaction for generating embeddings.

- **Dependencies**: Add `@google/genai` and `google-auth-library` to `apps/functions/package.json`.
- **Authentication**: Use `GoogleAuth` to fetch an access token for the `Service Account` credential .
- **Embedding**: Use `gemini-embedding-001`.

### 5.2 Ingestion & Search Logic

**Location**: `apps/functions/src/lib/ingest.ts`

1. **Fetch**: Retrieve raw content from `sourceUri`.
2. **Chunk**: Split text into segments < 1000 chars.
3. **Embed**: Generate vectors for each chunk.
4. **Store**: Save to Firestore `chunks` sub-collection with the `embedding` field.
5. **Search**: Use `collectionGroup('chunks').findNearest('embedding', queryVector, { limit: 5, distanceMeasure: 'COSINE' })`.

---

## 6. Frontend Implementation Details

### 6.1 Chat Component

**Location**: `apps/web/src/components/RAGChat.tsx`

- **UI Framework**: Utilize `@repo/ui` components (`Card`, `Button`) for consistency.
- **State Management**: Use `trpc.rag.chat.useMutation` hook for handling loading states and optimistic updates.
- **Markdown Support**: Use `react-markdown` to render the AI's structured response.

### 6.2 Admin Ingestion Page

**Location**: `apps/web/src/pages/Admin.tsx` (Protected Route)

- Simple form taking `sourceUri` and `title`.
- Triggers `trpc.rag.ingest.useMutation`.
- Displays a toast notification on success/failure.

---

## 7. Infrastructure & Security

### 7.1 IAM Permissions

Per the "Google Cloud 101" guide, we must ensure our Service Accounts are correctly provisioned to avoid deployment failures .

- **Cloud Build SA**:
- `roles/run.admin`
- `roles/artifactregistry.repoAdmin`
- `roles/iam.serviceAccountUser` (Critical for runtime identity).

- **Runtime Service Account** (used by Cloud Functions):
- `roles/aiplatform.user` (Access Vertex AI).

- `roles/datastore.user` (Access Firestore).
- `roles/storage.objectViewer` (Read raw docs).

### 7.2 Deployment

We use the existing `deploy-dev.yml` and `deploy-main.yml` workflows.

- **Environment Variables**:
  Update `.env` and GitHub Secrets with:
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `VECTOR_INDEX_ID`
- `VECTOR_ENDPOINT_ID`

---

## 8. Development Plan

### Phase 1: Shared Domain & Configuration

1. Create `packages/shared/src/schemas/rag.ts`.
2. Export new schemas in `packages/shared/src/index.ts`.
3. Add `@google/genai` dependency to `apps/functions`.

### Phase 2: Backend Implementation

1. Implement `vertex.ts` adapter (Auth + Embed + Search).
2. Implement `ingest.ts` logic (Chunking + Firestore).
3. Create `trpc/routers/rag.ts` and mount it to `appRouter`.

### Phase 3: Frontend Implementation

1. Create `RAGChat` component using `@repo/ui`.
2. Integrate into `App.tsx` for testing.

### Phase 4: Integration Testing

1. Run `pnpm test` to verify unit tests for chunking logic and schemas.
2. Deploy to `dev` branch using the CI/CD pipeline to verify IAM permissions and Vertex AI connectivity.
