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
  limit: vi.fn().mockReturnThis(),
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
    arrayUnion: vi.fn((...args: unknown[]) => args),
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

  // ── getMe ─────────────────────────────────────────────────────────────
  describe('getMe', () => {
    it('returns user profile with uid, email, displayName, role', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({
          email: 'user@example.com',
          displayName: 'Test User',
          role: 'admin',
        }),
      })

      const result = await caller.user.getMe()
      expect(result.uid).toBe('user-123')
      expect(result.email).toBe('user@example.com')
      expect(result.displayName).toBe('Test User')
      expect(result.role).toBe('admin')
    })

    it('defaults missing fields to null/user', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({}),
      })

      const result = await caller.user.getMe()
      expect(result.uid).toBe('user-123')
      expect(result.email).toBeNull()
      expect(result.displayName).toBeNull()
      expect(result.role).toBe('user')
    })
  })

  // ── getChatHistory ──────────────────────────────────────────────────
  describe('getChatHistory', () => {
    it('returns chat sessions for the authenticated user', async () => {
      mockCollectionRef.get.mockResolvedValueOnce({
        docs: [
          {
            id: 'session-1',
            data: () => ({
              userId: 'user-123',
              title: 'Chat 1',
              updatedAt: { toDate: () => new Date('2025-01-01') },
            }),
          },
        ],
      })

      const result = await caller.user.getChatHistory()
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('session-1')
      expect(result[0].title).toBe('Chat 1')
    })

    it('filters out archived sessions', async () => {
      mockCollectionRef.get.mockResolvedValueOnce({
        docs: [
          {
            id: 'session-active',
            data: () => ({
              userId: 'user-123',
              title: 'Active',
              updatedAt: { toDate: () => new Date() },
            }),
          },
          {
            id: 'session-archived',
            data: () => ({
              userId: 'user-123',
              title: 'Archived',
              archiveFolderId: 'folder-1',
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      })

      const result = await caller.user.getChatHistory()
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('session-active')
    })

    it('returns empty array when user has no sessions', async () => {
      mockCollectionRef.get.mockResolvedValueOnce({ docs: [] })

      const result = await caller.user.getChatHistory()
      expect(result).toEqual([])
    })
  })

  // ── createSession ───────────────────────────────────────────────────
  describe('createSession', () => {
    it('creates a session with title and messages', async () => {
      const result = await caller.user.createSession({
        title: 'New Chat',
        messages: [{ role: 'user', content: 'Hello!' }],
      })

      expect(result.sessionId).toBe('new-id')
      expect(mockDb.collection).toHaveBeenCalledWith('chatSessions')
      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          title: 'New Chat',
        })
      )
    })

    it('rejects empty title', async () => {
      await expect(
        caller.user.createSession({
          title: '',
          messages: [{ role: 'user', content: 'Hello!' }],
        })
      ).rejects.toThrow()
    })

    it('rejects empty messages array', async () => {
      await expect(
        caller.user.createSession({
          title: 'Chat',
          messages: [],
        })
      ).rejects.toThrow()
    })
  })

  // ── getSession ──────────────────────────────────────────────────────
  describe('getSession', () => {
    it('returns a session with its messages', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        id: 'session-1',
        data: () => ({
          userId: 'user-123',
          title: 'Chat',
          messages: [
            { role: 'user', content: 'Hello', citations: [], timestamp: '2025-01-01T00:00:00Z' },
          ],
        }),
      })

      const result = await caller.user.getSession({ sessionId: 'session-1' })
      expect(result.id).toBe('session-1')
      expect(result.title).toBe('Chat')
      expect(result.messages.length).toBe(1)
      expect(result.messages[0].role).toBe('user')
    })

    it('throws NOT_FOUND when session does not exist', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        data: () => undefined,
      })

      await expect(caller.user.getSession({ sessionId: 'nonexistent' })).rejects.toThrow()
    })

    it('throws NOT_FOUND when session belongs to another user', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        id: 'session-other',
        data: () => ({
          userId: 'other-user',
          title: 'Not Yours',
          messages: [],
        }),
      })

      await expect(caller.user.getSession({ sessionId: 'session-other' })).rejects.toThrow()
    })
  })

  // ── addMessages ─────────────────────────────────────────────────────
  describe('addMessages', () => {
    it('appends messages to an existing session', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({ userId: 'user-123', messages: [] }),
      })

      const result = await caller.user.addMessages({
        sessionId: 'session-1',
        messages: [{ role: 'assistant', content: 'Response' }],
      })

      expect(result.success).toBe(true)
      expect(mockDocRef.update).toHaveBeenCalled()
    })

    it('throws NOT_FOUND when session belongs to another user', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({ userId: 'other-user' }),
      })

      await expect(
        caller.user.addMessages({
          sessionId: 'session-1',
          messages: [{ role: 'user', content: 'Test' }],
        })
      ).rejects.toThrow()
    })
  })

  // ── deleteSession ───────────────────────────────────────────────────
  describe('deleteSession', () => {
    it('deletes a session belonging to the user', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({ userId: 'user-123' }),
      })

      const result = await caller.user.deleteSession({ sessionId: 'session-1' })
      expect(result.success).toBe(true)
      expect(mockDocRef.delete).toHaveBeenCalled()
    })

    it('throws NOT_FOUND when session belongs to another user', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({ userId: 'other-user' }),
      })

      await expect(caller.user.deleteSession({ sessionId: 'session-1' })).rejects.toThrow()
    })

    it('throws NOT_FOUND when session does not exist', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        data: () => undefined,
      })

      await expect(caller.user.deleteSession({ sessionId: 'nonexistent' })).rejects.toThrow()
    })
  })

  // ── getArchiveFolders ───────────────────────────────────────────────
  describe('getArchiveFolders', () => {
    it('returns folders with sessionCount', async () => {
      // First call: folders query
      mockCollectionRef.get
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'folder-1',
              data: () => ({
                userId: 'user-123',
                name: 'Archives',
                createdAt: { toDate: () => new Date('2025-01-01') },
                updatedAt: { toDate: () => new Date('2025-01-02') },
              }),
            },
          ],
        })
        // Second call: sessions count query
        .mockResolvedValueOnce({
          docs: [
            { data: () => ({ archiveFolderId: 'folder-1' }) },
            { data: () => ({ archiveFolderId: 'folder-1' }) },
          ],
        })

      const result = await caller.user.getArchiveFolders()
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('folder-1')
      expect(result[0].name).toBe('Archives')
      expect(result[0].sessionCount).toBe(2)
    })

    it('returns empty array when no folders exist', async () => {
      mockCollectionRef.get.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [] })

      const result = await caller.user.getArchiveFolders()
      expect(result).toEqual([])
    })
  })

  // ── getArchivedSessions ─────────────────────────────────────────────
  describe('getArchivedSessions', () => {
    it('returns sessions in a specific folder', async () => {
      // First call: folder ownership check
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({ userId: 'user-123', name: 'My Folder' }),
      })
      // Second call: sessions query
      mockCollectionRef.get.mockResolvedValueOnce({
        docs: [
          {
            id: 'session-archived-1',
            data: () => ({
              title: 'Archived Chat',
              updatedAt: { toDate: () => new Date('2025-01-01') },
            }),
          },
        ],
      })

      const result = await caller.user.getArchivedSessions({ folderId: 'folder-123' })
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('session-archived-1')
      expect(result[0].title).toBe('Archived Chat')
    })

    it('throws NOT_FOUND when folder does not belong to user', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({ userId: 'other-user', name: 'Not Yours' }),
      })

      await expect(caller.user.getArchivedSessions({ folderId: 'folder-other' })).rejects.toThrow()
    })

    it('returns empty array for empty folder', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({ userId: 'user-123', name: 'Empty Folder' }),
      })
      mockCollectionRef.get.mockResolvedValueOnce({ docs: [] })

      const result = await caller.user.getArchivedSessions({ folderId: 'folder-123' })
      expect(result).toEqual([])
    })
  })

  // ── Authorization ───────────────────────────────────────────────────
  describe('Authorization', () => {
    it('rejects unauthenticated callers', async () => {
      const unauthCaller = createCaller({})
      await expect(unauthCaller.user.getMe()).rejects.toThrow('Authentication required')
    })
  })
})
