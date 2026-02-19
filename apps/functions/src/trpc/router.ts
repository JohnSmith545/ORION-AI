import { router } from './trpc'
import { userRouter } from './routers/user.js'
import { ragRouter } from './routers/rag.js'

export const appRouter = router({
  user: userRouter,
  rag: ragRouter,
})

export type AppRouter = typeof appRouter
