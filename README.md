````markdown
# Orion AI

Orion AI is a production-ready RAG (Retrieval-Augmented Generation) chatbot platform designed to provide accurate, cited answers from a custom knowledge base. Built on a modern monorepo stack, it leverages **Google Vertex AI** for intelligence and **Firebase** for serverless scalability.

## 🚀 Project Overview

Orion AI enables users to ingest documents and query them using natural language. The system retrieves relevant context using Vector Search and generates answers using Gemini 2.5 Flash.

| Component     | Tech Choice        | Role                                               |
| :------------ | :----------------- | :------------------------------------------------- |
| **Frontend**  | React + Vite       | The interactive chat interface                     |
| **Backend**   | Firebase Functions | Orchestrates RAG logic and API requests            |
| **API Layer** | tRPC               | Type-safe communication between Frontend & Backend |
| **AI Engine** | Vertex AI          | Embeddings (Gecko) & Generation (Gemini)           |
| **Vector DB** | Vector Search      | Stores and retrieves semantic embeddings           |
| **Database**  | Firestore          | Stores raw document chunks and metadata            |

## 📂 Monorepo Structure

This project is built with **Turborepo** and **pnpm** workspaces.

```text
├── apps/
│   ├── web/              # 🎨 Frontend: React, Tailwind, Shadcn UI
│   │   ├── src/components/ # Chat interface & RAG UI components
│   │   └── src/hooks/      # tRPC hooks for data fetching
│   │
│   └── functions/        # ⚡ Backend: Firebase Cloud Functions
│       ├── src/trpc/     # tRPC Routers (RagRouter, UserRouter)
│       └── src/lib/      # Vertex AI & Firestore adapters
│
├── packages/
│   ├── ui/               # 🧩 Shared UI Component Library
│   ├── shared/           # 🤝 Shared Zod Schemas (API Contracts)
│   ├── config/           # ⚙️ Shared TS & Tooling Configs
│   └── eslint-config/    # urp Linting Rules
│
└── .github/              # 🤖 CI/CD Workflows (WIF + Deployments)
```
````

## 🛠️ Quick Start

### Prerequisites

- **Node.js 20+**
- **pnpm 8+** (`npm install -g pnpm`)
- **Google Cloud Project** (with Vertex AI API enabled)

### 1. Installation

Clone the repo and install dependencies:

```bash
git clone [https://github.com/johnsmith545/orion-ai.git](https://github.com/johnsmith545/orion-ai.git)
cd orion-ai
pnpm install

```

### 2. Environment Setup

Copy the example environment variables:

```bash
cp .env.example .env

```

_Update `.env` with your GCP Project ID and Firebase config._

### 3. Start Development

Run the entire stack (Frontend + Backend in watch mode):

```bash
pnpm dev

```

- **Web App:** [http://localhost:5173]()
- **Backend:** [http://localhost:5001]()

## ⚡ Key Features

### 🧠 RAG Architecture

The system implements a "Cheap-but-Real" architecture to minimize costs:

1. **Ingestion:** Admin uploads docs Chunked Embedded Stored in Vector Search.
2. **Retrieval:** User Query Embedded Vector Search (KNN) Fetch Chunks.
3. **Generation:** Context + Query Gemini Answer with Citations.

### 🛡️ Type-Safety

We use **tRPC** and **Zod** to ensure end-to-end type safety.

- **Shared Schemas:** Defined in `packages/shared/src/schemas/rag.ts`.
- **Frontend:** Gets autocompletion for backend procedures.
- **Backend:** Automatically validates all inputs before processing.

## 🤖 CI/CD Pipelines

Orion AI uses **GitHub Actions** with **Workload Identity Federation (WIF)** for keyless, secure deployments.

| Environment     | Branch  | Trigger         | URL                  |
| --------------- | ------- | --------------- | -------------------- |
| **Development** | `dev`   | Push to branch  | `dev.orion-ai.com`   |
| **Staging**     | `stage` | Push to branch  | `stage.orion-ai.com` |
| **Production**  | `main`  | Manual Approval | `orion-ai.com`       |

_See `docs/ci-cd/` for detailed deployment guides._

## 🧪 Testing & Quality

- **Linting:** `pnpm lint` (ESLint)
- **Type Checking:** `pnpm typecheck` (TypeScript)
- **Unit Tests:** `pnpm test` (Vitest)
- **Pre-Check:** `pnpm precheck` (Runs all the above)

## 🤝 Contributing

1. Create a feature branch from `dev`.
2. Make changes and run `pnpm precheck`.
3. If updating shared packages, run `pnpm changeset`.
4. Open a PR to `dev`.

---

_Built with ❤️ by the Orion AI Team_

```

```
