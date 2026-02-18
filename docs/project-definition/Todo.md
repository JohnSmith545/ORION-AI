# Todo.md

Based on the **Product Design Document**, **Technical Design Document**, and adhering to **Level 5 (Exceptional)** rubric standards, this plan integrates Advanced Patterns, Hexagonal Architecture, and Comprehensive Quality Assurance.

**Methodology:** TDD (Red -> Green -> Refactor) + ADRs + Zero-Regression Policy.

---

### Phase 1: Architecture, Ops & Developer Experience (The "Exceptional" Foundation)

**Goal:** Establish a "Turbo-cached" pipeline, IaC, and Architectural Decision Records (ADRs) before feature work.

- [ ] **Architecture Decision Records (ADRs)**
  - [ ] **Task:** Create `docs/adr/001-hexagonal-architecture.md` defining the Ports & Adapters strategy.
  - [ ] **Task:** Create `docs/adr/002-rag-vector-strategy.md` defining the specific embedding/search choices.
  - [ ] **Verification:** Peer review approval on PR.

- [ ] **Infrastructure as Code (IaC) & Scripts**
  - [ ] **Task:** Write `scripts/setup-infra.sh` (or Terraform) to fully recreate the GCP environment (Firestore, Vertex AI, IAM) from scratch.
  - [ ] **Task:** Implement autoscaling configuration for Cloud Functions (`minInstances`, `concurrency`).
  - [ ] **Verification:** Run script in a fresh GCP project; verify all resources exist and function.

- [ ] **CI/CD Pipeline (Turbo & Codecov)**
  - [ ] **Task:** Configure `turbo.json` for caching `lint`, `test`, and `build` tasks.
  - [ ] **Task:** Set up GitHub Actions for **Parallel Jobs** and **Preview Deploys** on PRs.
  - [ ] **Task:** Integrate **Codecov** to enforce >90% coverage gates.
  - [ ] **Verification:** Push a dummy commit; verify cache hit on second run and coverage report generation.

---

### Phase 2: Shared Domain & Contracts (Property-Based Testing)

**Goal:** Define strict boundaries and validate them with property-based tests.

- [ ] **Domain Modeling**
  - [ ] **🔴 Write Test:** Create `packages/shared/src/schemas/rag.test.ts` using **fast-check** for property-based testing (fuzzing inputs).
  - [ ] **🟢 Implement:** Create `packages/shared/src/schemas/rag.ts` with Zod.
  - [ ] **Task:** Define shared types for "Ports" (interfaces) to support Hexagonal decoupling.

---

### Phase 3: Backend Implementation (Hexagonal & Mutation Testing)

**Goal:** Build a "Plug-in Architecture" backend with "Exhaustive Error States".

- [ ] **Domain Logic (The Core)**
  - [ ] **🔴 Write Test:** Create `apps/functions/src/core/ingest/chunking.test.ts`. Use **Stryker** (Mutation Testing) to ensure tests kill all mutants in the chunking logic.
  - [ ] **🟢 Implement:** Implement pure TS chunking logic (no infrastructure dependencies).

- [ ] **Adapters (Infrastructure Layer)**
  - [ ] **🔴 Write Test:** Create `apps/functions/src/adapters/vertex/vertex-adapter.test.ts`. Mock the port interface, not just the library.
  - [ ] **🟢 Implement:** Implement `VertexAIAdapter` implementing `VectorStorePort`. Include strict error handling (retries, circuit breaking).

- [ ] **Application Services (The Use Cases)**
  - [ ] **🔴 Write Test:** Create `apps/functions/src/application/rag-service.test.ts`. Test the flow: `Ingest -> Chunk -> Store -> Index`.
  - [ ] **🟢 Implement:** Wire Core and Adapters in the Service layer.

- [ ] **Observability**
  - [ ] **Task:** Implement custom metrics (e.g., `vector_search_latency`, `token_usage_cost`) using Google Cloud Monitoring clients.
  - [ ] **Task:** Set up structured logging with correlation IDs for tracing across tRPC and internal services.

---

### Phase 4: Frontend Implementation (Pixel-Perfect & A11y)

**Goal:** "Production-level quality" with motion polish and accessibility compliance.

- [ ] **Component Library & Storybook**
  - [ ] **Task:** Create `RAGChat.stories.tsx` in Storybook.
  - [ ] **Task:** Implement `RAGChat` component with **Framer Motion** for smooth message entry/loading states.
  - [ ] **Verification:** Visual regression test via Storybook.

- [ ] **Accessibility (A11y) & UX**
  - [ ] **🔴 Write Test:** Create `apps/web/src/components/RAGChat.test.tsx` including `jest-axe` violations check.
  - [ ] **🟢 Implement:** Ensure proper ARIA labels, focus management, and keyboard navigation.
  - [ ] **Task:** Implement "Optimistic UI" for chat messages (show user message immediately).

- [ ] **E2E & Performance**
  - [ ] **Task:** Set up a Lighthouse CI check. Target: Performance > 90, Accessibility = 100.
  - [ ] **Task:** Implement SSR/SEO meta tags (OpenGraph) for shareable chat sessions (if public).

---

### Phase 5: Verification, Security & Launch

**Goal:** "Threat model documented" and "Zero-downtime" capability.

- [ ] **Security Hardening**
  - [ ] **Task:** Document `docs/security/threat-model.md` (STRIDE analysis).
  - [ ] **Task:** Implement dependency scanning in CI (e.g., Snyk or Dependabot).
  - [ ] **Task:** Validate "Admin-only" ingestion routes with penetration test scripts.

- [ ] **Deployment Strategy**
  - [ ] **Task:** Configure **Blue-Green** or **Canary** deployment strategy in Cloud Run/Functions (traffic splitting).
  - [ ] **Task:** Run seeding scripts to populate the DB with initial "Golden Data" for verification.

- [ ] **Final Retro & Changelog**
  - [ ] **Task:** Publish `CHANGELOG.md` (automated via Changesets).
  - [ ] **Task:** Schedule Post-Mortem/Retro if any "Near Misses" occurred during dev.