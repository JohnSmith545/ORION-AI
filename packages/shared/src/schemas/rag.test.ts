import { describe, it, expect } from 'vitest'
import {
  ChatQuerySchema,
  ChatResponseSchema,
  IngestDocSchema,
  TelemetrySchema,
  SessionMessageSchema,
  CreateSessionSchema,
  AddMessagesSchema,
  GetSessionSchema,
  DeleteSessionSchema,
} from './rag.ts'

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

// ── TelemetrySchema ───────────────────────────────────────────────────
describe('TelemetrySchema', () => {
  const validTelemetry = {
    name: 'ANDROMEDA',
    type: 'Spiral Galaxy',
    ra: '00h 42m 44s',
    dec: '+41° 16′ 9″',
    distance: '2.537 million LY',
    description: 'The nearest large galaxy to the Milky Way.',
  }

  it('validates a complete telemetry object', () => {
    const result = TelemetrySchema.safeParse(validTelemetry)
    expect(result.success).toBe(true)
  })

  it('allows nullable imageKeyword', () => {
    const result = TelemetrySchema.safeParse({ ...validTelemetry, imageKeyword: null })
    expect(result.success).toBe(true)
  })

  it('allows nullable imageUrl', () => {
    const result = TelemetrySchema.safeParse({ ...validTelemetry, imageUrl: null })
    expect(result.success).toBe(true)
  })

  it('allows optional imageKeyword and imageUrl (omitted)', () => {
    const result = TelemetrySchema.safeParse(validTelemetry)
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = TelemetrySchema.safeParse({ name: 'MARS' })
    expect(result.success).toBe(false)
  })
})

// ── SessionMessageSchema ──────────────────────────────────────────────
describe('SessionMessageSchema', () => {
  it('validates a user message', () => {
    const result = SessionMessageSchema.safeParse({ role: 'user', content: 'Hello' })
    expect(result.success).toBe(true)
  })

  it('validates an assistant message', () => {
    const result = SessionMessageSchema.safeParse({ role: 'assistant', content: 'Hi there!' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid role values', () => {
    const result = SessionMessageSchema.safeParse({ role: 'system', content: 'test' })
    expect(result.success).toBe(false)
  })

  it('allows optional citations array', () => {
    const result = SessionMessageSchema.safeParse({
      role: 'assistant',
      content: 'Answer',
      citations: ['https://example.com'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts message without citations', () => {
    const result = SessionMessageSchema.safeParse({ role: 'user', content: 'Question' })
    expect(result.success).toBe(true)
  })
})

// ── CreateSessionSchema ───────────────────────────────────────────────
describe('CreateSessionSchema', () => {
  it('validates with title and one message', () => {
    const result = CreateSessionSchema.safeParse({
      title: 'My Session',
      messages: [{ role: 'user', content: 'Hello' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = CreateSessionSchema.safeParse({
      title: '',
      messages: [{ role: 'user', content: 'Hello' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects title longer than 200 characters', () => {
    const result = CreateSessionSchema.safeParse({
      title: 'a'.repeat(201),
      messages: [{ role: 'user', content: 'Hello' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty messages array', () => {
    const result = CreateSessionSchema.safeParse({
      title: 'My Session',
      messages: [],
    })
    expect(result.success).toBe(false)
  })

  it('validates with multiple messages', () => {
    const result = CreateSessionSchema.safeParse({
      title: 'Chat',
      messages: [
        { role: 'user', content: 'Question' },
        { role: 'assistant', content: 'Answer' },
      ],
    })
    expect(result.success).toBe(true)
  })
})

// ── AddMessagesSchema ─────────────────────────────────────────────────
describe('AddMessagesSchema', () => {
  it('validates with sessionId and one message', () => {
    const result = AddMessagesSchema.safeParse({
      sessionId: 'session-123',
      messages: [{ role: 'user', content: 'Follow up' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty sessionId', () => {
    const result = AddMessagesSchema.safeParse({
      sessionId: '',
      messages: [{ role: 'user', content: 'Hello' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty messages array', () => {
    const result = AddMessagesSchema.safeParse({
      sessionId: 'session-123',
      messages: [],
    })
    expect(result.success).toBe(false)
  })
})

// ── GetSessionSchema ──────────────────────────────────────────────────
describe('GetSessionSchema', () => {
  it('validates with a non-empty sessionId', () => {
    const result = GetSessionSchema.safeParse({ sessionId: 'session-123' })
    expect(result.success).toBe(true)
  })

  it('rejects empty sessionId', () => {
    const result = GetSessionSchema.safeParse({ sessionId: '' })
    expect(result.success).toBe(false)
  })
})

// ── DeleteSessionSchema ───────────────────────────────────────────────
describe('DeleteSessionSchema', () => {
  it('validates with a non-empty sessionId', () => {
    const result = DeleteSessionSchema.safeParse({ sessionId: 'session-456' })
    expect(result.success).toBe(true)
  })

  it('rejects empty sessionId', () => {
    const result = DeleteSessionSchema.safeParse({ sessionId: '' })
    expect(result.success).toBe(false)
  })
})
