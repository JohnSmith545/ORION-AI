import { initTRPC, TRPCError } from '@trpc/server'

// ── Context ────────────────────────────────────────────────────────────
// Populated by the Express createContext function in index.ts.
// `uid` is set when a valid Firebase ID-token is present.
export interface Context {
  uid?: string
}

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const createCallerFactory = t.createCallerFactory

// ── Protected Procedure ────────────────────────────────────────────────
// Requires a valid Firebase-authenticated uid on the context.
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.uid) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' })
  }
  return next({ ctx: { uid: ctx.uid } })
})

export const protectedProcedure = t.procedure.use(isAuthed)

// ── Admin Procedure ────────────────────────────────────────────────────
// Extends protectedProcedure: fetches the Firestore user doc and checks
// that role === 'admin'. Uses lazy import to avoid top-level firebase-admin.
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.uid) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' })
  }

  const { getFirestore } = await import('firebase-admin/firestore')
  const userDoc = await getFirestore().collection('users').doc(ctx.uid).get()
  const data = userDoc.data()

  if (!data || data.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
  }

  return next({ ctx: { uid: ctx.uid, role: 'admin' as const } })
})

export const adminProcedure = t.procedure.use(isAuthed).use(isAdmin)
