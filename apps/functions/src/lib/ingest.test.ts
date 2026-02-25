import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ingestDocument, saveToFirestore, fetchContent, fetchFromGCS, chunkText } from './ingest.js'
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

// ── fetchContent SSRF Protection ──────────────────────────────────────
describe('fetchContent - SSRF Protection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should reject HTTP (non-HTTPS) URLs', async () => {
    await expect(fetchContent('http://example.com/doc.txt')).rejects.toThrow(
      'Only HTTPS is allowed'
    )
  })

  it('should reject 10.x.x.x private IP addresses', async () => {
    await expect(fetchContent('https://10.0.0.1/secret')).rejects.toThrow('SSRF protection')
  })

  it('should reject 172.16-31.x.x private IP addresses', async () => {
    await expect(fetchContent('https://172.16.0.1/secret')).rejects.toThrow('SSRF protection')
    await expect(fetchContent('https://172.31.255.255/secret')).rejects.toThrow('SSRF protection')
  })

  it('should reject 192.168.x.x private IP addresses', async () => {
    await expect(fetchContent('https://192.168.1.1/secret')).rejects.toThrow('SSRF protection')
  })

  it('should reject 169.254.x.x link-local addresses', async () => {
    await expect(fetchContent('https://169.254.169.254/metadata')).rejects.toThrow(
      'SSRF protection'
    )
  })

  it('should reject metadata.google.internal hostname', async () => {
    await expect(fetchContent('https://metadata.google.internal/v1')).rejects.toThrow(
      'SSRF protection'
    )
  })

  it('should accept a valid public HTTPS URL and return text content', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('Hello World'),
    } as Response)

    const content = await fetchContent('https://example.com/doc.txt')
    expect(content).toBe('Hello World')
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/doc.txt')
  })

  it('should throw when fetch response is not ok', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    } as Response)

    await expect(fetchContent('https://example.com/missing.txt')).rejects.toThrow(
      'Failed to fetch content'
    )
  })
})

// ── fetchFromGCS ──────────────────────────────────────────────────────
describe('fetchFromGCS', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should parse gs://bucket/path correctly and return UTF-8 text', async () => {
    const content = await fetchFromGCS('gs://my-bucket/docs/report.txt')
    expect(content).toBe('GCS document content for testing.')
  })

  it('should throw on invalid GCS URI format', async () => {
    await expect(fetchFromGCS('not-a-gcs-uri')).rejects.toThrow('Invalid GCS URI')
  })

  it('should throw on empty GCS file contents', async () => {
    const { getStorage } = await import('firebase-admin/storage')
    vi.mocked(getStorage).mockReturnValueOnce({
      bucket: vi.fn().mockReturnValue({
        file: vi.fn().mockReturnValue({
          download: vi.fn().mockResolvedValue([Buffer.from('')]),
        }),
      }),
    } as never)

    await expect(fetchFromGCS('gs://empty-bucket/empty.txt')).rejects.toThrow(
      'GCS file is empty or not found'
    )
  })
})

// ── chunkText Edge Cases ──────────────────────────────────────────────
describe('chunkText', () => {
  it('should return single chunk when text is shorter than chunk size', () => {
    expect(chunkText('hello', 100, 10)).toEqual(['hello'])
  })

  it('should return single chunk when text is exactly chunk size', () => {
    const text = 'a'.repeat(100)
    expect(chunkText(text, 100, 10)).toEqual([text])
  })

  it('should throw when chunk size is 0', () => {
    expect(() => chunkText('hello', 0, 0)).toThrow('Chunk size must be greater than 0')
  })

  it('should throw when chunk size is negative', () => {
    expect(() => chunkText('hello', -5, 0)).toThrow('Chunk size must be greater than 0')
  })

  it('should throw when overlap >= size', () => {
    expect(() => chunkText('hello world', 5, 5)).toThrow('Overlap must be less than chunk size')
    expect(() => chunkText('hello world', 5, 10)).toThrow('Overlap must be less than chunk size')
  })

  it('should handle overlap of 0 correctly', () => {
    const chunks = chunkText('abcdefghij', 5, 0)
    expect(chunks).toEqual(['abcde', 'fghij'])
  })

  it('should produce overlapping chunks with correct boundaries', () => {
    // 10 chars, chunk size 6, overlap 2 → step = 4
    const chunks = chunkText('abcdefghij', 6, 2)
    expect(chunks[0]).toBe('abcdef')
    expect(chunks[1]).toBe('efghij')
    expect(chunks.length).toBe(2)
  })

  it('should handle single character text', () => {
    expect(chunkText('a', 10, 5)).toEqual(['a'])
  })

  it('should handle empty string', () => {
    expect(chunkText('', 10, 5)).toEqual([''])
  })
})

// ── Ingestion Workflow Integration (existing) ─────────────────────────
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
    expect(db.collection).toHaveBeenCalledWith('documentChunks')
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
