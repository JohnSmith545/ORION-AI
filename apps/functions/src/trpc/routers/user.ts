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

    return snapshot.docs.map(doc => {
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
})
