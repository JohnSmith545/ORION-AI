# Threat Model: ORION AI

> **Audit Date:** 2026-02-25
> **Auditor:** Automated Security Review
> **Scope:** Full-stack — backend (Cloud Functions), frontend (React SPA), database (Firestore), dependencies, and infrastructure.

---

## 1. Authentication & Authorisation

### 1.1 Firebase Authentication

| Item                   | Status  | Detail                                                                                                           |
| :--------------------- | :------ | :--------------------------------------------------------------------------------------------------------------- |
| Token verification     | ✅ PASS | `getAuth().verifyIdToken(token)` in `index.ts:66`. Tokens extracted from `Authorization: Bearer <token>` header. |
| Missing token handling | ✅ PASS | Returns empty context `{}` when no token is present — `protectedProcedure` then rejects with `UNAUTHORIZED`.     |
| Invalid token handling | ✅ PASS | Caught in try/catch, logs error, returns empty context. No token details leaked.                                 |

### 1.2 tRPC Middleware Chain

| Item                  | Status  | Detail                                                                                        |
| :-------------------- | :------ | :-------------------------------------------------------------------------------------------- |
| `isAuthed` middleware | ✅ PASS | Rejects with `UNAUTHORIZED` when `ctx.uid` is missing. Applied to all non-public procedures.  |
| `isAdmin` middleware  | ✅ PASS | Fetches Firestore user doc and checks `role === 'admin'`. Rejects with `FORBIDDEN` otherwise. |
| Middleware stacking   | ✅ PASS | `adminProcedure` correctly chains `isAuthed` → `isAdmin`.                                     |
| `chat` procedure      | ✅ PASS | Uses `protectedProcedure` — requires authenticated user.                                      |
| `ingest` procedure    | ✅ PASS | Uses `adminProcedure` — requires authenticated admin.                                         |

### 1.3 Data Ownership Enforcement (IDOR Prevention)

| Procedure             | Ownership Check                                               | Status  |
| :-------------------- | :------------------------------------------------------------ | :------ |
| `getMe`               | Reads only `ctx.uid` doc                                      | ✅ PASS |
| `getChatHistory`      | `.where('userId', '==', ctx.uid)`                             | ✅ PASS |
| `createSession`       | Sets `userId: ctx.uid` on creation                            | ✅ PASS |
| `getSession`          | Verifies `data.userId !== ctx.uid` → throws `NOT_FOUND`       | ✅ PASS |
| `addMessages`         | Verifies `data.userId !== ctx.uid` → throws `NOT_FOUND`       | ✅ PASS |
| `deleteSession`       | Verifies `data.userId !== ctx.uid` → throws `NOT_FOUND`       | ✅ PASS |
| `clearHistory`        | `.where('userId', '==', ctx.uid)`                             | ✅ PASS |
| `createFolder`        | Sets `userId: ctx.uid` on creation                            | ✅ PASS |
| `renameFolder`        | Verifies `data.userId !== ctx.uid` → throws `NOT_FOUND`       | ✅ PASS |
| `deleteFolder`        | Verifies `data.userId !== ctx.uid` → throws `NOT_FOUND`       | ✅ PASS |
| `archiveSession`      | Verifies both session and folder ownership                    | ✅ PASS |
| `unarchiveSession`    | Verifies `sessionData.userId !== ctx.uid`                     | ✅ PASS |
| `getArchivedSessions` | Verifies folder ownership + `.where('userId', '==', ctx.uid)` | ✅ PASS |

---

## 2. Input Validation

### 2.1 Zod Schema Validation

| Schema                 | Constraints                                                                                            | Status  |
| :--------------------- | :----------------------------------------------------------------------------------------------------- | :------ |
| `ChatQuerySchema`      | `question`: `.min(1).max(1000)`, `history`: typed array, `files`: typed array with `data` + `mimeType` | ✅ PASS |
| `IngestDocSchema`      | `.refine()` validates `sourceUri` format matches `sourceType` (gs:// vs https://)                      | ✅ PASS |
| `CreateSessionSchema`  | `title`: `.min(1).max(200)`, `messages`: `.min(1)`                                                     | ✅ PASS |
| `SessionMessageSchema` | `role`: `.enum(['user', 'assistant'])`, `content`: string                                              | ✅ PASS |
| `CreateFolderSchema`   | `name`: `.min(1).max(50).trim()`                                                                       | ✅ PASS |
| `UserSchema`           | `role`: `.enum(['admin', 'user'])`                                                                     | ✅ PASS |

### 2.2 Missing Validations

| Item                       | Risk      | Recommendation                                                                                                                              |
| :------------------------- | :-------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| File `data` field (base64) | ⚠️ MEDIUM | No size limit on base64 file data in `ChatQuerySchema.files`. Large payloads could cause memory pressure. Add `.max()` to the `data` field. |
| File `mimeType` field      | ⚠️ LOW    | No allowlist for accepted MIME types. Consider restricting to `image/*` and `application/pdf`.                                              |

---

## 3. Server-Side Request Forgery (SSRF) Protection

### 3.1 Ingestion Pipeline (`ingest.ts`)

| Item                  | Status  | Detail                                                                    |
| :-------------------- | :------ | :------------------------------------------------------------------------ |
| HTTPS enforcement     | ✅ PASS | `parsedUrl.protocol !== 'https:'` rejects non-HTTPS.                      |
| Private IP blocking   | ✅ PASS | Blocks `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`. |
| GCP metadata blocking | ✅ PASS | Blocks `metadata.google.internal`.                                        |
| GCS URI validation    | ✅ PASS | Regex validates `gs://bucket/path` format.                                |

### 3.2 External API Calls (`rag.ts`)

| Item               | Risk   | Detail                                                                                                                                                                                 |
| :----------------- | :----- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NASA API call      | ✅ LOW | Uses `encodeURIComponent()` on the keyword. Fixed base URL.                                                                                                                            |
| Wikipedia API call | ✅ LOW | Uses `encodeURIComponent()` on the keyword. Fixed base URL.                                                                                                                            |
| DNS rebinding      | ⚠️ LOW | `fetchContent` checks hostname but doesn't resolve DNS before fetching. A DNS rebinding attack could theoretically bypass IP checks. Mitigated by Cloud Functions network environment. |

---

## 4. Cross-Site Scripting (XSS) Prevention

| Item                      | Status  | Detail                                                       |
| :------------------------ | :------ | :----------------------------------------------------------- |
| `dangerouslySetInnerHTML` | ✅ PASS | Not used anywhere in the codebase.                           |
| `eval()`                  | ✅ PASS | Not used anywhere in the codebase.                           |
| `.innerHTML`              | ✅ PASS | Not used anywhere in the codebase.                           |
| Markdown rendering        | ✅ PASS | Custom `renderMarkdown()` — does not use raw HTML injection. |
| React default escaping    | ✅ PASS | All user content rendered through JSX (auto-escaped).        |

---

## 5. Database Security (Firestore Rules)

| Collection                      | Rule                                                                                                 | Status                    |
| :------------------------------ | :--------------------------------------------------------------------------------------------------- | :------------------------ |
| `docs/{docId}`                  | `allow read, write: if false`                                                                        | ✅ PASS — Admin SDK only  |
| `docs/{docId}/chunks/{chunkId}` | `allow read, write: if false`                                                                        | ✅ PASS — Admin SDK only  |
| `users/{userId}`                | `auth.uid == userId`                                                                                 | ✅ PASS — Owner only      |
| `chatSessions/{sessionId}`      | `resource.data.userId == auth.uid` (read/write), `request.resource.data.userId == auth.uid` (create) | ✅ PASS                   |
| `archiveFolders/{folderId}`     | `resource.data.userId == auth.uid` (read/write), `request.resource.data.userId == auth.uid` (create) | ✅ PASS                   |
| `/{document=**}` (catch-all)    | `allow read, write: if false`                                                                        | ✅ PASS — Deny by default |

---

## 6. Network & Transport Security

| Item            | Status  | Detail                                                                                           |
| :-------------- | :------ | :----------------------------------------------------------------------------------------------- |
| CORS            | ✅ PASS | Restricted to `https://orion-ai-2790b.web.app` and `http://localhost:5173`. Credentials enabled. |
| Rate limiting   | ✅ PASS | 50 requests per minute per IP via `express-rate-limit`. `trust proxy` enabled.                   |
| Allowed methods | ✅ PASS | Restricted to `GET`, `POST`, `OPTIONS`.                                                          |
| Allowed headers | ✅ PASS | Restricted to `Content-Type`, `Authorization`, `X-Requested-With`, `X-TRPC-Source`.              |

---

## 7. Error Handling & Information Disclosure

| Item                      | Status  | Detail                                                                                                           |
| :------------------------ | :------ | :--------------------------------------------------------------------------------------------------------------- |
| tRPC error handler        | ✅ PASS | `onError` logs to server console, doesn't leak stack traces to client.                                           |
| Gemini JSON parse failure | ✅ PASS | Gracefully falls back to raw text response — no crash, no stack leak.                                            |
| ownership check errors    | ✅ PASS | Returns generic `NOT_FOUND` instead of `FORBIDDEN` — prevents enumeration attacks.                               |
| Hardcoded project ID      | ⚠️ LOW  | `orion-ai-2790b` is hardcoded as a fallback in `gemini.ts:4`. Not a secret, but should use env vars exclusively. |

---

## 8. Client-Side Security

| Item                | Status  | Detail                                                                                         |
| :------------------ | :------ | :--------------------------------------------------------------------------------------------- |
| Route guards        | ✅ PASS | `PrivateRoute` component redirects unauthenticated users to `/auth`.                           |
| Token storage       | ✅ PASS | Firebase SDK manages token storage (IndexedDB). No manual `localStorage` token handling found. |
| Code splitting      | ✅ PASS | Lazy-loaded pages via `React.lazy()` — reduces initial bundle exposure.                        |
| `speechSynthesis`   | ✅ PASS | Only speaks static hardcoded string. No user input passed to speech API.                       |
| `SpeechRecognition` | ✅ PASS | Transcript is set as input value — goes through normal React state flow (no injection risk).   |

---

## 9. Infrastructure & Dependencies

| Item                | Status  | Detail                                                                                   |
| :------------------ | :------ | :--------------------------------------------------------------------------------------- |
| Firebase Admin SDK  | ✅ PASS | Initialised with `getApps()` guard — no double-init risk.                                |
| Lazy-loaded imports | ✅ PASS | Heavy dependencies loaded inside function handlers to reduce cold-start times.           |
| Cached Express app  | ✅ PASS | `cachedApp` pattern prevents re-initialisation across invocations without leaking state. |
| Max instances       | ✅ PASS | `maxInstances: 10` caps scale to prevent abuse-driven cost escalation.                   |
| GCS trigger         | ✅ PASS | `processUploadedDocument` only processes `.txt` files from a specific bucket.            |

---

## 10. Risk Summary

| #   | Finding                                                      | Severity  | Status                                   |
| :-- | :----------------------------------------------------------- | :-------- | :--------------------------------------- |
| 1   | No file size limit on base64 data in `ChatQuerySchema.files` | ⚠️ MEDIUM | Open                                     |
| 2   | No MIME type allowlist for file attachments                  | ⚠️ LOW    | Open                                     |
| 3   | Theoretical DNS rebinding on `fetchContent`                  | ⚠️ LOW    | Mitigated by Cloud Functions environment |
| 4   | Hardcoded project ID fallback in `gemini.ts`                 | ⚠️ LOW    | Cosmetic — not a secret                  |
| 5   | Empty ADR docs (`ADR-001`, `ADR-002`, `PEN_TEST_PLAN`)       | ℹ️ INFO   | Documentation gap                        |
| 6   | Content Security Policy (CSP) headers not configured         | ⚠️ LOW    | Open                                     |

### Previously Identified — Now Resolved

| #                    | Finding                                                             | Resolution |
| :------------------- | :------------------------------------------------------------------ | :--------- |
| ~~Rate limiting~~    | ✅ Implemented — 50 req/min via `express-rate-limit`                |
| ~~SSRF protection~~  | ✅ Implemented — HTTPS-only, private IP blocking, metadata blocking |
| ~~Input validation~~ | ✅ Implemented — Zod schemas on all tRPC procedures                 |

---

## 11. Recommendations

1. **Add file size validation** — Add `.max(10_485_760)` (~10 MB base64) to the `data` field in `ChatQuerySchema.files`.
2. **Add MIME type allowlist** — Restrict the `mimeType` field to `z.enum(['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])`.
3. **Add CSP headers** — Configure `Content-Security-Policy` in the Express app or via Firebase hosting config.
4. **Set up `pnpm audit`** in CI — Add a step to the CI pipeline to run dependency vulnerability scanning.
5. **Populate ADR documents** — Fill in `ADR-001`, `ADR-002`, and `PEN_TEST_PLAN.md` with architectural decisions.
