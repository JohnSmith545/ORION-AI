import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ingestDocument } from './ingest.js'
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

// Mock Firestore
vi.mock('firebase-admin/firestore', () => {
  const mockBatch = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(true),
  }
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
      batch: vi.fn().mockReturnValue(mockBatch),
    }),
    FieldValue: {
      vector: vi.fn(v => v),
      serverTimestamp: vi.fn(),
    },
    Timestamp: {
      now: vi.fn().mockReturnValue('mock-timestamp'),
    },
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
    expect(db.batch).toHaveBeenCalled()
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
