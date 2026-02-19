import { describe, it, expect, vi, afterEach } from 'vitest'
import { getQueryEmbedding, retrieveContext } from './rag.js'
import type { IVectorStore } from '../ports/vector-store.js'
import * as gemini from './gemini.js'

// Mock Gemini Adapter
vi.mock('./gemini', () => ({
  embedTexts: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
}))

// Mock the Firestore adapter so it is never imported during unit tests.
// retrieveContext receives a store via its parameter, so we never reach
// the default firestoreVectorStore in these tests.
vi.mock('./firestore-vector-store', () => ({
  firestoreVectorStore: {},
}))

// A simple in-memory test double that satisfies IVectorStore.
const mockStore: IVectorStore = {
  findNearest: vi.fn().mockResolvedValue([
    { text: 'Context chunk 1', sourceUri: 'uri1' },
    { text: 'Context chunk 2', sourceUri: 'uri2' },
  ]),
}

describe('RAG Retrieval Logic', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getQueryEmbedding', () => {
    it('should call embedTexts for the user query', async () => {
      const query = 'What is ORION AI?'
      const vector = await getQueryEmbedding(query)

      expect(gemini.embedTexts).toHaveBeenCalledWith([query])
      expect(vector).toEqual([0.1, 0.2, 0.3])
    })
  })

  describe('retrieveContext', () => {
    it('should delegate to the injected IVectorStore', async () => {
      const vector = [0.1, 0.2, 0.3]
      const context = await retrieveContext(vector, 5, mockStore)

      expect(mockStore.findNearest).toHaveBeenCalledWith(vector, 5)
      expect(context.length).toBe(2)
      expect(context[0].text).toBe('Context chunk 1')
      expect(context[0].sourceUri).toBe('uri1')
    })

    it('should forward the limit to the store', async () => {
      const vector = [0.5, 0.5]
      await retrieveContext(vector, 3, mockStore)

      expect(mockStore.findNearest).toHaveBeenCalledWith(vector, 3)
    })
  })
})
