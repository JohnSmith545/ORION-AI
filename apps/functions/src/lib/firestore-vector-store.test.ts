import { describe, it, expect, vi, afterEach } from 'vitest'
import { firestoreVectorStore } from './firestore-vector-store.js'

// Mock Firestore with chained query builder
const mockDocs = [
  {
    data: () => ({
      text: 'Chunk about stars',
      sourceUri: 'https://docs.ai/stars',
      distance: 0.12,
    }),
  },
  {
    data: () => ({
      text: 'Chunk about planets',
      sourceUri: 'https://docs.ai/planets',
      distance: 0.34,
    }),
  },
]

const mockGet = vi.fn().mockResolvedValue({ docs: mockDocs })
const mockFindNearest = vi.fn().mockReturnValue({ get: mockGet })
const mockSelect = vi.fn().mockReturnValue({ findNearest: mockFindNearest })
const mockCollectionGroup = vi.fn().mockReturnValue({ select: mockSelect })

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collectionGroup: (...args: unknown[]) => mockCollectionGroup(...args),
  })),
  FieldValue: {
    vector: vi.fn((v: number[]) => v),
  },
}))

describe('firestoreVectorStore', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('findNearest', () => {
    it('should query collectionGroup "documentChunks"', async () => {
      await firestoreVectorStore.findNearest([0.1, 0.2], 5)
      expect(mockCollectionGroup).toHaveBeenCalledWith('documentChunks')
    })

    it('should select only "text" and "sourceUri" fields', async () => {
      await firestoreVectorStore.findNearest([0.1, 0.2], 5)
      expect(mockSelect).toHaveBeenCalledWith('text', 'sourceUri')
    })

    it('should use COSINE distance measure with distanceResultField', async () => {
      const vector = [0.1, 0.2, 0.3]
      await firestoreVectorStore.findNearest(vector, 3)

      expect(mockFindNearest).toHaveBeenCalledWith({
        vectorField: 'embedding',
        queryVector: vector,
        limit: 3,
        distanceMeasure: 'COSINE',
        distanceResultField: 'distance',
      })
    })

    it('should return mapped results with text, sourceUri, and distance', async () => {
      const results = await firestoreVectorStore.findNearest([0.1], 5)

      expect(results).toEqual([
        { text: 'Chunk about stars', sourceUri: 'https://docs.ai/stars', distance: 0.12 },
        { text: 'Chunk about planets', sourceUri: 'https://docs.ai/planets', distance: 0.34 },
      ])
    })

    it('should return empty array when snapshot has no docs', async () => {
      mockGet.mockResolvedValueOnce({ docs: [] })

      const results = await firestoreVectorStore.findNearest([0.1], 5)
      expect(results).toEqual([])
    })

    it('should pass through the exact limit parameter', async () => {
      await firestoreVectorStore.findNearest([0.5, 0.5], 10)

      expect(mockFindNearest).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }))
    })
  })
})
