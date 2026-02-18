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

// Input for Ingestion
export const IngestDocSchema = z.object({
  sourceUri: z.string().url(),
  sourceType: z.enum(['gcs', 'api']),
  title: z.string().optional(),
})

export type ChatQuery = z.infer<typeof ChatQuerySchema>
export type ChatResponse = z.infer<typeof ChatResponseSchema>
export type IngestDoc = z.infer<typeof IngestDocSchema>
