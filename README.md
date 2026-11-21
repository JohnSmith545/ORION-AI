# Orion AI

Orbital Retrieval and Intelligence Observation Network (Orion AI) is a RAG (Retrieval-Augmented Generation) chatbot that gives cited answers about astronomy, astrophysics and space missions from a custom knowledge base. It runs on a TypeScript monorepo, with **Google Vertex AI** for embeddings and generation and **Firebase** for the serverless backend.

## Project overview

Admins ingest documents; users ask questions in natural language. The system retrieves the most relevant chunks with Vector Search and generates an answer with Gemini 2.5 Flash, citing its sources.

| Component     | Tech choice        | Role                                               |
| :------------ | :----------------- | :------------------------------------------------- |
| **Frontend**  | React + Vite       | The chat interface                                 |
| **Backend**   | Firebase Functions | Orchestrates the RAG logic and API requests        |
| **API layer** | tRPC               | Type-safe calls between frontend and backend       |
| **AI engine** | Vertex AI          | Embeddings (`text-embedding-004`) and generation (`gemini-2.5-flash`) |
| **Vector DB** | Vector Search      | Stores and retrieves semantic embeddings           |
| **Database**  | Firestore          | Stores document chunks and metadata                |

## Monorepo structure

Built with **Turborepo** and **pnpm** workspaces.

```text
├── apps/
│   ├── web/                # Frontend: React, Tailwind, shadcn/ui
│   │   ├── src/components/ # Chat interface and RAG UI components
│   │   └── src/hooks/      # tRPC hooks for data fetching
│   │
│   └── functions/          # Backend: Firebase Cloud Functions
│       ├── src/trpc/       # tRPC routers (RagRouter, UserRouter)
│       └── src/lib/        # Vertex AI and Firestore adapters
│
├── packages/
│   ├── ui/                 # Shared UI component library
│   ├── shared/             # Shared Zod schemas (API contracts)
│   ├── config/             # Shared TypeScript and tooling configs
│   └── eslint-config/      # Shared lint rules
│
└── .github/                # CI/CD workflows
```

## Quick start

### Prerequisites

- **Node.js 20+**
- **pnpm 8+** (`npm install -g pnpm`)
- **A Google Cloud project** with the Vertex AI API enabled

### 1. Install

```bash
git clone https://github.com/JohnSmith545/ORION-AI.git
cd ORION-AI
pnpm install
```

### 2. Configure

```bash
cp .env.example .env
```

Update `.env` with your GCP project ID and Firebase config.

### 3. Run

Run the whole stack (frontend and backend in watch mode):

```bash
pnpm dev
```

- Web app: http://localhost:5173
- Backend (Functions emulator): http://localhost:5001

## How the RAG pipeline works

The design keeps costs low while staying a real retrieval system:

1. **Ingestion:** an admin uploads documents → they are chunked → each chunk is embedded → embeddings go to Vector Search, chunks and metadata to Firestore.
2. **Retrieval:** the user's question is embedded → Vector Search finds the nearest chunks (KNN) → the chunks are fetched from Firestore.
3. **Generation:** the retrieved context and the question go to Gemini → it answers with citations to the source chunks.

A step-by-step walkthrough is in [`docs/RAG-INGESTION-WALKTHROUGH.md`](docs/RAG-INGESTION-WALKTHROUGH.md).

## Type safety

**tRPC** and **Zod** give end-to-end type safety:

- **Shared schemas** live in `packages/shared/src/schemas/rag.ts`.
- **Frontend:** autocompletion for every backend procedure.
- **Backend:** every input is validated before processing.

## CI/CD

GitHub Actions run lint, type checks, tests and dependency review on every pull request. Deployments to Firebase use **Workload Identity Federation**, so no long-lived service account keys are stored in GitHub. There are separate deploy workflows for development, staging and production, each running in its own GitHub environment.

Details are in [`docs/ci-cd/`](docs/ci-cd/).

## Testing and quality

- **Lint:** `pnpm lint` (ESLint)
- **Type check:** `pnpm typecheck` (TypeScript)
- **Unit tests:** `pnpm test` (Vitest)
- **All checks:** `pnpm precheck` (lint, type check, build and tests)

## Contributing

1. Create a feature branch.
2. Make your changes and run `pnpm precheck`.
3. If you change a shared package, run `pnpm changeset`.
4. Open a pull request.

## Authors

Built by [@JohnSmith545](https://github.com/JohnSmith545) and [@Yz31LL](https://github.com/Yz31LL).
