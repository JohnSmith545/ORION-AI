# Technical Design Document: ORION AI

## 1. Introduction

This document details the **Level 5 (Exceptional)** technical implementation of ORION AI. It prioritizes **Hexagonal Architecture**, **Advanced CI/CD**, and **Observability** to ensure a robust, maintainable, and scalable system.

## 2. System Architecture

We will adopt a **Hexagonal Architecture (Ports and Adapters)** pattern to decouple the core domain logic from external infrastructure (Vertex AI, Firestore).

### 2.1 Layers

1.  **Domain Layer (Core):**
    * Pure TypeScript entities and logic.
    * *No dependencies* on frameworks or external SDKs.
    * Contains: `ChunkingService`, `RAGOrchestrator`.

2.  **Application Layer (Ports):**
    * Defines interfaces (Ports) that the core needs.
    * Example: `IVectorStore`, `IDocumentRepository`, `ILLMProvider`.

3.  **Infrastructure Layer (Adapters):**
    * Concrete implementations of Ports.
    * Example: `VertexAIAdapter` (implements `IVectorStore`), `FirestoreAdapter` (implements `IDocumentRepository`).
    * Dependency Injection (DI) is used to wire these at runtime.

### 2.2 Architectural Decision Records (ADRs)
* **ADR-001:** Adoption of Hexagonal Architecture for testability.
* **ADR-002:** Use of `gemini-embedding-001` with `task_type` optimization.
* **ADR-003:** StreamUpdate strategy for Vector Search to minimize ingestion latency.

---

## 3. Infrastructure & Operations (Ops)

### 3.1 Infrastructure as Code (IaC)
* **Recreation Strategy:** A master script (`scripts/recreate-infra.ts`) utilizing the Google Cloud SDK will allow for full environment teardown and recreation in <15 minutes.
* **Autoscaling:** Cloud Functions configured with:
    * `minInstances`: 1 (to prevent cold starts in prod).
    * `concurrency`: 80.
    * `memory`: 1GiB.

### 3.2 Observability & Alerts
* **Custom Metrics:**
    * `rag_retrieval_latency`: Histogram of time spent in Vector Search.
    * `rag_token_usage`: Counter for input/output tokens.
* **Alerting:** PagerDuty/Email alerts triggered if `5xx` error rate > 1% over 5 minutes.
* **Dashboards:** A Grafana/GCP Monitoring dashboard visualizing these metrics.

---

## 4. CI/CD & Developer Experience

### 4.1 Turbo Pipeline
* **Caching:** Intelligent caching of `build` and `test` artifacts. Re-running a passed test on unchanged code takes 0ms.
* **Parallelization:** Linting, Type-Checking, and Unit Tests run in parallel jobs.

### 4.2 Quality Gates
* **Mutation Testing:** `Stryker` runs on the Core Domain to verify test quality (killing mutants).
* **Code Coverage:** Codecov enforcement of 95% on Domain logic, 90% on Adapters.
* **Dependency Scanning:** Automated vulnerability checks in the pipeline.

### 4.3 Deployment Strategy
* **Blue-Green:** Use Cloud Run revisions/traffic splitting. New deployments take 0% traffic initially, then 10% (Canary), then 100%.
* **Preview Deploys:** Every PR deploys a temporary instance of the frontend and backend for visual QA.

---

## 5. API Design & Data Model

### 5.1 tRPC (Typed API)
* **Validation:** Strict Zod schemas for all inputs.
* **Error Handling:** Custom `TRPCError` mapping for domain exceptions (e.g., `DomainError` -> `400 BAD REQUEST`, `InfraError` -> `500 INTERNAL SERVER ERROR`).

### 5.2 Database (Firestore)
* **Seeding:** `pnpm db:seed` script populates local emulator and dev environments with realistic dummy data for UI development.
* **Indexes:** `firestore.indexes.json` managed in git to ensure consistent indexing across environments.

---

## 6. Implementation Plan

### Phase 1: Core & Ports (Pure TS)
1.  Define `IVectorStore`, `IDocumentRepository`.
2.  Implement `IngestionService` logic (chunking strategies) with **Property-Based Tests** (fast-check).

### Phase 2: Adapters (Integration)
1.  Implement `VertexAIAdapter` with `@google/genai`.
2.  Implement `FirestoreAdapter`.
3.  Add **Contract Tests** to ensure Adapters meet Port specifications.

### Phase 3: Assembly & Interface
1.  Wire up DI container in `apps/functions`.
2.  Implement `RAGChat` UI with **A11y** audit tools (`jest-axe`) integrated.
3.  Perform **Lighthouse** audit on the build.