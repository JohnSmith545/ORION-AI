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
const unauthenticatedCaller = createCaller({})
const caller = createCaller({ uid: 'user-123' })

describe('userRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDocRef.get.mockResolvedValue(mockDoc)
  })

  describe('create', () => {
    it('creates a user with valid data', async () => {
      const result = await unauthenticatedCaller.user.create({
        email: 'test@example.com',
        name: 'Test User',
      })
      expect(result.id).toBeDefined()
      expect(result.email).toBe('test@example.com')
      expect(result.name).toBe('Test User')
    })

    it('returns a dummy id', async () => {
      const result = await unauthenticatedCaller.user.create({
        email: 'another@example.com',
      })
      expect(result.id).toBe('dummy-id')
    })
  })

  describe('getById', () => {
    it('returns a user by id', async () => {
      const result = await unauthenticatedCaller.user.getById('user-1')
      expect(result.id).toBe('user-1')
      expect(result.email).toBeDefined()
    })
  })

  describe('list', () => {
    it('returns a list of users', async () => {
      const result = await unauthenticatedCaller.user.list()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })
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
})
