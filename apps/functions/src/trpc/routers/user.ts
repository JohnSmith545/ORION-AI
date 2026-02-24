import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc.js'
import { CreateUserSchema, UserSchema } from '@repo/shared'

// ── Local Schema Definitions ──────────────────────────────────────────
// These are defined locally to fix build errors and ensure strict typing.

const SessionMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  citations: z.array(z.string()).optional(),
})

const CreateSessionSchema = z.object({
  title: z.string().min(1).max(200),
  messages: z.array(SessionMessageSchema).min(1),
})

const AddMessagesSchema = z.object({
  sessionId: z.string().min(1),
  messages: z.array(SessionMessageSchema).min(1),
})

const GetSessionSchema = z.object({
  sessionId: z.string().min(1),
})

const DeleteSessionSchema = z.object({
  sessionId: z.string().min(1),
})

export const userRouter = router({
  create: publicProcedure
    .input(CreateUserSchema)
    .output(UserSchema)
    .mutation(({ input }) => ({
      id: 'dummy-id',
      email: input.email,
      name: input.name,
    })),

  getById: publicProcedure
    .input(z.string())
    .output(UserSchema)
    .query(({ input }) => ({
      id: input,
      email: 'test@example.com',
      name: 'Test User',
    })),

  list: publicProcedure.output(z.array(UserSchema)).query(() => [
    { id: 'user-1', email: 'user1@example.com', name: 'User One' },
    { id: 'user-2', email: 'user2@example.com', name: 'User Two' },
  ]),

  // ── Get current user's profile (including role) ─────────────────────
  getMe: protectedProcedure.query(async ({ ctx }) => {
    const { getFirestore } = await import('firebase-admin/firestore')
    const doc = await getFirestore().collection('users').doc(ctx.uid).get()
    const data = doc.data()

    return {
      uid: ctx.uid,
      email: data?.email ?? null,
      displayName: data?.displayName ?? null,
      role: data?.role ?? 'user',
    }
  }),

  // ── Get chat history list for the current user ──────────────────────
  getChatHistory: protectedProcedure.query(async ({ ctx }) => {
    const { getFirestore } = await import('firebase-admin/firestore')
    const snapshot = await getFirestore()
      .collection('chatSessions')
      .where('userId', '==', ctx.uid)
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get()

    return snapshot.docs
      .filter(doc => !doc.data().archiveFolderId)
      .map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title ?? 'Untitled Session',
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        }
      })
  }),

  // ── Create a new chat session with initial messages ─────────────────
  createSession: protectedProcedure.input(CreateSessionSchema).mutation(async ({ ctx, input }) => {
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
    const now = FieldValue.serverTimestamp()

    const docRef = await getFirestore()
      .collection('chatSessions')
      .add({
        userId: ctx.uid,
        title: input.title,
        messages: input.messages.map(m => ({
          role: m.role,
          content: m.content,
          citations: m.citations ?? [],
          timestamp: new Date().toISOString(),
        })),
        createdAt: now,
        updatedAt: now,
      })

    return { sessionId: docRef.id }
  }),

  // ── Get a session with all its messages ─────────────────────────────
  getSession: protectedProcedure.input(GetSessionSchema).query(async ({ ctx, input }) => {
    const { getFirestore } = await import('firebase-admin/firestore')
    const doc = await getFirestore().collection('chatSessions').doc(input.sessionId).get()
    const data = doc.data()

    if (!data || data.userId !== ctx.uid) {
      throw new (await import('@trpc/server')).TRPCError({
        code: 'NOT_FOUND',
        message: 'Session not found',
      })
    }

    return {
      id: doc.id,
      title: data.title ?? 'Untitled Session',
      messages: (data.messages ?? []).map((m: Record<string, unknown>) => ({
        role: m.role as string,
        content: m.content as string,
        citations: (m.citations as string[]) ?? [],
        timestamp: m.timestamp as string,
      })),
    }
  }),

  // ── Append messages to an existing session ──────────────────────────
  addMessages: protectedProcedure.input(AddMessagesSchema).mutation(async ({ ctx, input }) => {
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
    const docRef = getFirestore().collection('chatSessions').doc(input.sessionId)
    const doc = await docRef.get()
    const data = doc.data()

    if (!data || data.userId !== ctx.uid) {
      throw new (await import('@trpc/server')).TRPCError({
        code: 'NOT_FOUND',
        message: 'Session not found',
      })
    }

    const newMessages = input.messages.map(m => ({
      role: m.role,
      content: m.content,
      citations: m.citations ?? [],
      timestamp: new Date().toISOString(),
    }))

    await docRef.update({
      messages: FieldValue.arrayUnion(...newMessages),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { success: true }
  }),

  // ── Delete a chat session ───────────────────────────────────────────
  deleteSession: protectedProcedure.input(DeleteSessionSchema).mutation(async ({ ctx, input }) => {
    const { getFirestore } = await import('firebase-admin/firestore')
    const docRef = getFirestore().collection('chatSessions').doc(input.sessionId)
    const doc = await docRef.get()
    const data = doc.data()

    if (!data || data.userId !== ctx.uid) {
      throw new (await import('@trpc/server')).TRPCError({
        code: 'NOT_FOUND',
        message: 'Session not found',
      })
    }

    await docRef.delete()
    return { success: true }
  }),

  // ── Archive Folders ───────────────────────────────────────────────────

  getArchiveFolders: protectedProcedure.query(async ({ ctx }) => {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()

    // Query without orderBy to avoid requiring a composite index
    const foldersSnap = await db.collection('archiveFolders').where('userId', '==', ctx.uid).get()

    // Count archived sessions per folder — gracefully handle missing index
    let counts: Record<string, number> = {}
    try {
      const sessionsSnap = await db
        .collection('chatSessions')
        .where('userId', '==', ctx.uid)
        .where('archiveFolderId', '!=', null)
        .select('archiveFolderId')
        .get()

      for (const doc of sessionsSnap.docs) {
        const fid = doc.data().archiveFolderId as string
        counts[fid] = (counts[fid] ?? 0) + 1
      }
    } catch {
      counts = {}
    }

    const folders = foldersSnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name as string,
        sessionCount: counts[doc.id] ?? 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      }
    })

    // Sort newest-first in JS instead of requiring a Firestore composite index
    folders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    return folders
  }),

  createFolder: protectedProcedure.input(CreateFolderSchema).mutation(async ({ ctx, input }) => {
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
    const now = FieldValue.serverTimestamp()

    const docRef = await getFirestore().collection('archiveFolders').add({
      userId: ctx.uid,
      name: input.name,
      createdAt: now,
      updatedAt: now,
    })

    return { folderId: docRef.id }
  }),

  renameFolder: protectedProcedure.input(RenameFolderSchema).mutation(async ({ ctx, input }) => {
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
    const docRef = getFirestore().collection('archiveFolders').doc(input.folderId)
    const doc = await docRef.get()
    const data = doc.data()

    if (!data || data.userId !== ctx.uid) {
      throw new (await import('@trpc/server')).TRPCError({
        code: 'NOT_FOUND',
        message: 'Folder not found',
      })
    }

    await docRef.update({
      name: input.name,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { success: true }
  }),

  deleteFolder: protectedProcedure.input(DeleteFolderSchema).mutation(async ({ ctx, input }) => {
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const folderRef = db.collection('archiveFolders').doc(input.folderId)
    const folderDoc = await folderRef.get()
    const folderData = folderDoc.data()

    if (!folderData || folderData.userId !== ctx.uid) {
      throw new (await import('@trpc/server')).TRPCError({
        code: 'NOT_FOUND',
        message: 'Folder not found',
      })
    }

    // Unarchive all sessions in this folder, then delete the folder
    const sessionsSnap = await db
      .collection('chatSessions')
      .where('userId', '==', ctx.uid)
      .where('archiveFolderId', '==', input.folderId)
      .get()

    const batch = db.batch()
    for (const sessionDoc of sessionsSnap.docs) {
      batch.update(sessionDoc.ref, {
        archiveFolderId: null,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
    batch.delete(folderRef)
    await batch.commit()

    return { success: true }
  }),

  archiveSession: protectedProcedure
    .input(ArchiveSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
      const db = getFirestore()

      const sessionRef = db.collection('chatSessions').doc(input.sessionId)
      const sessionDoc = await sessionRef.get()
      const sessionData = sessionDoc.data()

      if (!sessionData || sessionData.userId !== ctx.uid) {
        throw new (await import('@trpc/server')).TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      const folderRef = db.collection('archiveFolders').doc(input.folderId)
      const folderDoc = await folderRef.get()
      const folderData = folderDoc.data()

      if (!folderData || folderData.userId !== ctx.uid) {
        throw new (await import('@trpc/server')).TRPCError({
          code: 'NOT_FOUND',
          message: 'Folder not found',
        })
      }

      await sessionRef.update({
        archiveFolderId: input.folderId,
        updatedAt: FieldValue.serverTimestamp(),
      })

      return { success: true }
    }),

  unarchiveSession: protectedProcedure
    .input(UnarchiveSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
      const sessionRef = getFirestore().collection('chatSessions').doc(input.sessionId)
      const sessionDoc = await sessionRef.get()
      const sessionData = sessionDoc.data()

      if (!sessionData || sessionData.userId !== ctx.uid) {
        throw new (await import('@trpc/server')).TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      await sessionRef.update({
        archiveFolderId: null,
        updatedAt: FieldValue.serverTimestamp(),
      })

      return { success: true }
    }),

  getArchivedSessions: protectedProcedure
    .input(z.object({ folderId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { getFirestore } = await import('firebase-admin/firestore')
      const db = getFirestore()

      // Verify folder ownership
      const folderDoc = await db.collection('archiveFolders').doc(input.folderId).get()
      const folderData = folderDoc.data()

      if (!folderData || folderData.userId !== ctx.uid) {
        throw new (await import('@trpc/server')).TRPCError({
          code: 'NOT_FOUND',
          message: 'Folder not found',
        })
      }

      const snapshot = await db
        .collection('chatSessions')
        .where('userId', '==', ctx.uid)
        .where('archiveFolderId', '==', input.folderId)
        .get()

      const sessions = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title ?? 'Untitled Session',
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        }
      })

      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      return sessions
    }),
})
