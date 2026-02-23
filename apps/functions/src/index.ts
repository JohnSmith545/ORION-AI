import type { Express } from 'express'
import { onRequest } from 'firebase-functions/v2/https'

let cachedApp: Express | null = null

// Export the Firebase function
export const api = onRequest({ maxInstances: 10 }, async (req, res) => {
  if (!cachedApp) {
    const [
      { initializeApp, getApps },
      { default: express },
      { default: cors },
      trpcExpress,
      { appRouter },
    ] = await Promise.all([
      import('firebase-admin/app'),
      import('express'),
      import('cors'),
      import('@trpc/server/adapters/express'),
      import('./trpc/router.js'),
    ])

    // Initialize Firebase Admin if not already initialized
    if (getApps().length === 0) {
      initializeApp()
    }

    const app = express()

    // Apply CORS with explicit settings to force preflight success
    app.use(
      cors({
        origin: true, // Echoes the request origin
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-TRPC-Source'],
      })
    )

    // Mount tRPC middleware at the root
    app.use(
      '/',
      trpcExpress.createExpressMiddleware({
        router: appRouter,
        createContext: async ({ req }) => {
          const authHeader = req.headers.authorization
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split('Bearer ')[1]
            try {
              const { getAuth } = await import('firebase-admin/auth')
              const decodedToken = await getAuth().verifyIdToken(token)
              return { uid: decodedToken.uid }
            } catch (error) {
              console.error('Invalid Firebase token:', error)
            }
          }
          return {} // Return empty context if not logged in
        },
        onError: ({ error, path }) => {
          console.error(`tRPC Error on [${path}]:`, error)
        },
      })
    )

    cachedApp = app
  }

  // Pass the request and response to the cached Express app
  return cachedApp(req, res)
})
