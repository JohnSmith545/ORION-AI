import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@repo/functions/router'
import { auth } from './firebase'

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL || 'http://localhost:5001/orion-ai-2790b/us-central1/api',
      async headers() {
        const user = auth.currentUser
        if (user) {
          const token = await user.getIdToken()
          return { Authorization: `Bearer ${token}` }
        }
        return {}
      },
    }),
  ],
})
