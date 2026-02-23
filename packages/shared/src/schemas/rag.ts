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
    .optional(),
})

// Output for the Chat Interface
export const ChatResponseSchema = z.object({
  response: z.string(),
  citations: z.array(z.string()),
})

// Input for Ingestion.
// sourceUri format must match sourceType:
//   api  → standard http/https URL
//   gcs  → Google Cloud Storage URI (gs://bucket/path)
export const IngestDocSchema = z
  .object({
    sourceUri: z.string().min(1),
    sourceType: z.enum(['gcs', 'api']),
    title: z.string().optional(),
  })
  .refine(
    ({ sourceType, sourceUri }) =>
      sourceType === 'gcs' ? sourceUri.startsWith('gs://') : /^https?:\/\//.test(sourceUri),
    {
      message:
        'sourceUri must be a gs:// URI for sourceType "gcs", or an http/https URL for sourceType "api"',
    }
  )

export type ChatQuery = z.infer<typeof ChatQuerySchema>
export type ChatResponse = z.infer<typeof ChatResponseSchema>
export type IngestDoc = z.infer<typeof IngestDocSchema>

// ── Chat Session Schemas ──────────────────────────────────────────────

export const SessionMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  citations: z.array(z.string()).optional(),
})

export const CreateSessionSchema = z.object({
  title: z.string().min(1).max(200),
  messages: z.array(SessionMessageSchema).min(1),
})

export const AddMessagesSchema = z.object({
  sessionId: z.string().min(1),
  messages: z.array(SessionMessageSchema).min(1),
})

export const GetSessionSchema = z.object({
  sessionId: z.string().min(1),
})

export const DeleteSessionSchema = z.object({
  sessionId: z.string().min(1),
})

export type SessionMessage = z.infer<typeof SessionMessageSchema>
export type CreateSession = z.infer<typeof CreateSessionSchema>
export type AddMessages = z.infer<typeof AddMessagesSchema>
