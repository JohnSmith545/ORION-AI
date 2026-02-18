# Product Design: Vertex AI RAG Chatbot Integration

## 1. Executive Summary

This document defines the requirements for the **Orion AI** RAG system.
**Target Level:** 5 (Exceptional).
We aim for a "Pixel-perfect, branded design" with "Production-level quality" including exhaustive error handling, accessibility compliance, and zero-downtime operations.

---

## 2. User Experience (UX) & Design

To meet the **Exceptional** rubric:

### A. Visual & Interaction Design
- **Motion Polish:** The chat interface must use physics-based animations (e.g., `framer-motion`) for message bubbles, typing indicators, and citations appearing. It should not feel static.
- **Pixel-Perfection:** Implementation must match the Figma mocks exactly (spacing, typography, shadows).
- **Theming:** Support system-level Dark/Light mode switching instantly without flash-of-unstyled-content (FOUC).

### B. Accessibility (A11y)
- **Compliance:** Must pass **WCAG 2.1 AA** standards.
- **Screen Readers:** All interactive elements (citations, inputs, buttons) must have correct ARIA labels.
- **Keyboard Navigation:** Users must be able to navigate the entire chat history and citations using only the keyboard.
- **Audit:** An automated `axe-core` audit is required in the CI pipeline.

### C. Performance (Lighthouse)
- **Target:** Lighthouse Performance score > 90 on mobile.
- **Optimizations:** Lazy load the chat history; optimistic UI updates for sending messages; code-splitting for the Admin ingestion routes.

---

## 3. Product Management & Quality Goals

### A. Data-Driven Decisions
- **Analytics:** All chat interactions (upvotes/downvotes, latency, citation clicks) must be logged to BigQuery/Analytics for retro analysis.
- **Feedback Loop:** The UI must allow users to rate answers to tune the RAG retrieval quality.

### B. Testing Policy
- **Zero-Regression:** Any bug found must have a reproduction test case added before the fix is merged.
- **Property-Based Testing:** Use fuzzing strategies to test input sanitization on the Chat API.

---

## 4. Security & Compliance

### A. Threat Modeling
- **Documentation:** A formal Threat Model (STRIDE) must be documented in the repo (`docs/threat-model.md`).
- **Penetration Testing:** Automated scripts must attempt to inject malicious prompts (Prompt Injection) and unauthorized ingestion requests.

### B. Data Privacy
- **PII Redaction:** The system must attempt to detect and redact PII before sending data to Vertex AI (if applicable).
- **RBAC:** Strict Role-Based Access Control. Only `admin` role can access Ingestion endpoints.

---

## 5. Component Specifications

### Frontend (`apps/web`)
- **Framework:** React + Vite + TanStack Query (for rigorous state management).
- **Error Handling:** Graceful UI degradation. If Vector Search is down, show a friendly "Maintenance Mode" toast, not a white screen.

### Backend (`apps/functions`)
- **Architecture:** Hexagonal (Ports & Adapters).
- **Observability:** Custom metrics for "Hallucination Rate" (implied by user feedback) and "Token Consumption".

---

## 6. Development Workflow

- **Changelog:** Automated public changelog generation using Changesets.
- **CI/CD:** Preview environments generated for every Pull Request to allow Product/Design review before merge.