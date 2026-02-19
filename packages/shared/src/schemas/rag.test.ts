import { describe, it, expect } from 'vitest'
import { ChatQuerySchema, ChatResponseSchema, IngestDocSchema } from './rag.ts'

describe('ChatQuerySchema', () => {
  it('validates correct chat query', () => {
    const result = ChatQuerySchema.safeParse({
      question: 'What is Orion AI?',
      history: [
        { role: 'user', text: 'Hello' },
        { role: 'model', text: 'Hi! How can I help?' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty questions', () => {
    const result = ChatQuerySchema.safeParse({ question: '' })
    expect(result.success).toBe(false)
  })

  it('rejects questions longer than 1000 characters', () => {
    const result = ChatQuerySchema.safeParse({ question: 'a'.repeat(1001) })
    expect(result.success).toBe(false)
  })

  it('allows optional history', () => {
    const result = ChatQuerySchema.safeParse({ question: 'Working?' })
    expect(result.success).toBe(true)
  })
})

describe('ChatResponseSchema', () => {
  it('validates correct chat response', () => {
    const result = ChatResponseSchema.safeParse({
      response: 'This is the answer.',
      citations: ['https://example.com/1', 'https://example.com/2'],
    })
    expect(result.success).toBe(true)
  })

  it('allows an empty citations array', () => {
    const result = ChatResponseSchema.safeParse({
      response: 'Answer with no sources.',
      citations: [],
    })
    expect(result.success).toBe(true)
  })

  it('requires a response', () => {
    const result = ChatResponseSchema.safeParse({ citations: [] })
    expect(result.success).toBe(false)
  })

  it('requires citations to be an array', () => {
    const result = ChatResponseSchema.safeParse({ response: 'Test', citations: 'not-array' })
    expect(result.success).toBe(false)
  })
})

describe('IngestDocSchema', () => {
  it('validates correct ingestion input', () => {
    const result = IngestDocSchema.safeParse({
      sourceUri: 'https://example.com/doc.pdf',
      sourceType: 'api',
      title: 'Sample Doc',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a valid GCS URI with sourceType gcs', () => {
    const result = IngestDocSchema.safeParse({
      sourceUri: 'gs://my-bucket/docs/report.pdf',
      sourceType: 'gcs',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a plain string with no scheme', () => {
    const result = IngestDocSchema.safeParse({
      sourceUri: 'not-a-url',
      sourceType: 'gcs',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a GCS URI when sourceType is api', () => {
    const result = IngestDocSchema.safeParse({
      sourceUri: 'gs://my-bucket/file.pdf',
      sourceType: 'api',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an http URL when sourceType is gcs', () => {
    const result = IngestDocSchema.safeParse({
      sourceUri: 'https://example.com/doc.pdf',
      sourceType: 'gcs',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid sourceType', () => {
    const result = IngestDocSchema.safeParse({
      sourceUri: 'https://example.com',
      sourceType: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})
