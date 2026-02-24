import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ingestDocument, saveToFirestore } from './ingest.js'
import * as gemini from './gemini.js'

// Mock Firebase Storage (used by fetchFromGCS)
vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn().mockReturnValue({
    bucket: vi.fn().mockReturnValue({
      file: vi.fn().mockReturnValue({
        download: vi.fn().mockResolvedValue([Buffer.from('GCS document content for testing.')]),
      }),
    }),
  }),
}))

// Mock Firestore — track batch() calls to verify batching logic
const mockBatchSet = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue(true)
const mockBatchFn = vi.fn().mockImplementation(() => ({
  set: mockBatchSet,
  commit: mockBatchCommit,
}))

vi.mock('firebase-admin/firestore', () => {
  const mockDoc = {
    set: vi.fn().mockResolvedValue(true),
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({ set: vi.fn() }),
    }),
  }
  const mockCollection = {
    doc: vi.fn().mockReturnValue(mockDoc),
  }
  return {
    getFirestore: vi.fn().mockReturnValue({
      collection: vi.fn().mockReturnValue(mockCollection),
      batch: (...args: unknown[]) => mockBatchFn(...args),
    }),
    FieldValue: {
      vector: vi.fn(v => v),
      serverTimestamp: vi.fn(),
    },
    Timestamp: {
      now: vi.fn().mockReturnValue('mock-timestamp'),
    },
    WriteBatch: vi.fn(),
  }
})

// Mock Gemini Adapter
vi.mock('./gemini', () => ({
  embedTexts: vi.fn().mockResolvedValue([
    [0.1, 0.2],
    [0.3, 0.4],
  ]),
}))

describe('Ingestion Workflow Integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should orchestrate the full ingestion process for an HTTP URL', async () => {
    const mockContent = 'This is a long test document that will be chunked and embedded.'
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockContent),
    } as Response)

    const docId = await ingestDocument('https://example.com/test.txt', 'Test Document')

    expect(docId).toBeDefined()
    expect(global.fetch).toHaveBeenCalled()
    expect(gemini.embedTexts).toHaveBeenCalled()

    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    expect(db.collection).toHaveBeenCalledWith('docs')
    expect(mockBatchFn).toHaveBeenCalled()
  })

  it('should read from GCS and NOT call fetch for sourceType gcs', async () => {
    const docId = await ingestDocument('gs://my-bucket/docs/report.txt', 'GCS Document', 'gcs')

    expect(docId).toBeDefined()
    // fetch must not be called when sourcing from GCS
    expect(global.fetch).not.toHaveBeenCalled()
    expect(gemini.embedTexts).toHaveBeenCalled()

    const { getStorage } = await import('firebase-admin/storage')
    expect(getStorage).toHaveBeenCalled()
  })
})

describe('saveToFirestore batching', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create multiple WriteBatch instances for > 450 chunks', async () => {
    const chunkCount = 500
    const chunks = Array.from({ length: chunkCount }, (_, i) => `chunk-${i}`)
    const embeddings = Array.from({ length: chunkCount }, () => [0.1, 0.2])

    await saveToFirestore('doc_test', 'Test', 'gs://bucket/file.txt', chunks, embeddings)

    // 500 chunks / 450 per batch = 2 batches
    expect(mockBatchFn).toHaveBeenCalledTimes(2)
    expect(mockBatchCommit).toHaveBeenCalledTimes(2)
    // First batch should have 450 set() calls, second should have 50
    expect(mockBatchSet).toHaveBeenCalledTimes(chunkCount)
  })

  it('should use a single WriteBatch for <= 450 chunks', async () => {
    const chunkCount = 100
    const chunks = Array.from({ length: chunkCount }, (_, i) => `chunk-${i}`)
    const embeddings = Array.from({ length: chunkCount }, () => [0.5, 0.6])

    await saveToFirestore('doc_small', 'Small', 'gs://bucket/small.txt', chunks, embeddings)

    expect(mockBatchFn).toHaveBeenCalledTimes(1)
    expect(mockBatchCommit).toHaveBeenCalledTimes(1)
    expect(mockBatchSet).toHaveBeenCalledTimes(chunkCount)
  })
})
