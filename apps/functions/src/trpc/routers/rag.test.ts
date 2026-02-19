import { describe, it, expect, vi, afterEach } from 'vitest'
import { appRouter } from '../router'
import { createCallerFactory } from '../trpc'

// Mock the entire lib layer so the tRPC procedure is tested in isolation.
// This verifies orchestration (correct order of calls, correct return shape)
// without touching Vertex AI or Firestore.
vi.mock('../../lib/rag', () => ({
  getQueryEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  retrieveContext: vi.fn().mockResolvedValue([
    { text: 'Relevant chunk about ORION AI.', sourceUri: 'https://docs.orion.ai/overview' },
    { text: 'Vertex AI powers the embeddings.', sourceUri: 'https://docs.orion.ai/architecture' },
  ]),
}))

vi.mock('../../lib/gemini', () => ({
  generateGroundedResponse: vi
    .fn()
    .mockResolvedValue('ORION AI is a RAG platform powered by Vertex AI. [Source 1]'),
  embedTexts: vi.fn(),
}))

vi.mock('../../lib/ingest', () => ({
  ingestDocument: vi.fn().mockResolvedValue('doc_1700000000000'),
}))

const createCaller = createCallerFactory(appRouter)
const caller = createCaller({})

describe('ragRouter', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('chat', () => {
    it('returns a response and citations for a valid question', async () => {
      const result = await caller.rag.chat({ question: 'What is ORION AI?' })

      expect(result.response).toBe('ORION AI is a RAG platform powered by Vertex AI. [Source 1]')
      expect(result.citations).toEqual([
        'https://docs.orion.ai/overview',
        'https://docs.orion.ai/architecture',
      ])
    })

    it('calls the RAG pipeline in the correct order', async () => {
      const { getQueryEmbedding, retrieveContext } = await import('../../lib/rag')
      const { generateGroundedResponse } = await import('../../lib/gemini')

      await caller.rag.chat({ question: 'Tell me about Vertex AI' })

      expect(getQueryEmbedding).toHaveBeenCalledWith('Tell me about Vertex AI')
      expect(retrieveContext).toHaveBeenCalledWith([0.1, 0.2, 0.3])
      expect(generateGroundedResponse).toHaveBeenCalled()
    })

    it('rejects an empty question', async () => {
      await expect(caller.rag.chat({ question: '' })).rejects.toThrow()
    })

    it('rejects a question exceeding 1000 characters', async () => {
      await expect(caller.rag.chat({ question: 'a'.repeat(1001) })).rejects.toThrow()
    })
  })

  describe('ingest', () => {
    it('returns success and a docId for a valid URL', async () => {
      const result = await caller.rag.ingest({
        sourceUri: 'https://example.com/doc.pdf',
        sourceType: 'api',
        title: 'Sample Document',
      })

      expect(result.success).toBe(true)
      expect(result.docId).toBe('doc_1700000000000')
    })

    it('accepts a valid GCS URI with sourceType gcs', async () => {
      const result = await caller.rag.ingest({
        sourceUri: 'gs://my-bucket/docs/report.pdf',
        sourceType: 'gcs',
        title: 'GCS Document',
      })
      expect(result.success).toBe(true)
      expect(result.docId).toBe('doc_1700000000000')
    })

    it('rejects a plain string with no scheme', async () => {
      await expect(
        caller.rag.ingest({ sourceUri: 'not-a-url', sourceType: 'gcs' })
      ).rejects.toThrow()
    })

    it('rejects a GCS URI when sourceType is api', async () => {
      await expect(
        caller.rag.ingest({ sourceUri: 'gs://my-bucket/file.pdf', sourceType: 'api' })
      ).rejects.toThrow()
    })
  })
})
