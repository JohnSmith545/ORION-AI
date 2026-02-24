import { describe, it, expect, vi, beforeEach } from 'vitest'
import { appRouter } from '../router'
import { createCallerFactory } from '../trpc'

const mockDoc = {
  id: 'folder-123',
  data: () => ({ userId: 'user-123', name: 'Old Name' }),
  ref: {},
}

const mockDocRef = {
  get: vi.fn().mockResolvedValue(mockDoc),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
}

const mockCollectionRef = {
  doc: vi.fn().mockReturnValue(mockDocRef),
  add: vi.fn().mockResolvedValue({ id: 'new-id' }),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue({
    docs: [mockDoc],
  }),
}

const mockBatch = {
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn().mockResolvedValue({}),
}

const mockDb = {
  collection: vi.fn().mockReturnValue(mockCollectionRef),
  batch: vi.fn().mockReturnValue(mockBatch),
}

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockDb),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'mock-timestamp'),
  },
}))

const createCaller = createCallerFactory(appRouter)
const caller = createCaller({ uid: 'user-123' })

describe('userRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDocRef.get.mockResolvedValue(mockDoc)
  })

  describe('archive folders', () => {
    it('createFolder creates a folder', async () => {
      const result = await caller.user.createFolder({ name: 'My Folder' })
      expect(result.folderId).toBe('new-id')
      expect(mockDb.collection).toHaveBeenCalledWith('archiveFolders')
      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Folder',
          userId: 'user-123',
        })
      )
    })

    it('renameFolder renames a folder', async () => {
      const result = await caller.user.renameFolder({ folderId: 'folder-123', name: 'New Name' })
      expect(result.success).toBe(true)
      expect(mockDb.collection).toHaveBeenCalledWith('archiveFolders')
      expect(mockCollectionRef.doc).toHaveBeenCalledWith('folder-123')
      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name',
        })
      )
    })

    it('deleteFolder deletes a folder and unarchives sessions', async () => {
      const result = await caller.user.deleteFolder({ folderId: 'folder-123' })
      expect(result.success).toBe(true)
      expect(mockDb.batch).toHaveBeenCalled()
      expect(mockBatch.delete).toHaveBeenCalled()
      expect(mockBatch.commit).toHaveBeenCalled()
    })
  })

  describe('archive sessions', () => {
    it('archiveSession sets archiveFolderId', async () => {
      const result = await caller.user.archiveSession({
        sessionId: 'session-1',
        folderId: 'folder-123',
      })
      expect(result.success).toBe(true)
      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          archiveFolderId: 'folder-123',
        })
      )
    })

    it('unarchiveSession unsets archiveFolderId', async () => {
      const result = await caller.user.unarchiveSession({ sessionId: 'session-1' })
      expect(result.success).toBe(true)
      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          archiveFolderId: null,
        })
      )
    })
  })

  describe('clearHistory', () => {
    it('batch-deletes all sessions and returns count', async () => {
      const mockSessionDoc = { ref: { id: 'session-1' } }
      mockCollectionRef.get.mockResolvedValueOnce({
        empty: false,
        size: 2,
        docs: [mockSessionDoc, { ref: { id: 'session-2' } }],
      })

      const result = await caller.user.clearHistory()
      expect(result.success).toBe(true)
      expect(result.count).toBe(2)
      expect(mockBatch.delete).toHaveBeenCalledTimes(2)
      expect(mockBatch.commit).toHaveBeenCalled()
    })

    it('returns count 0 when user has no sessions', async () => {
      mockCollectionRef.get.mockResolvedValueOnce({
        empty: true,
        size: 0,
        docs: [],
      })

      const result = await caller.user.clearHistory()
      expect(result.success).toBe(true)
      expect(result.count).toBe(0)
    })
  })
})
