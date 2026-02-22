import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc.js'
import { CreateUserSchema, UserSchema } from '@repo/shared'

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

  // ── New: Get current user's profile (including role) ───────────────
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

  // ── New: Get chat history for the current user ─────────────────────
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
})
