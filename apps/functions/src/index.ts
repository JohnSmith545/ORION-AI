import type { Express } from 'express'
import { onRequest } from 'firebase-functions/v2/https'
import { onObjectFinalized } from 'firebase-functions/v2/storage'

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
    const { default: helmet } = await import('helmet')

    // Apply security headers
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
      })
    )

    // Trust proxy is required for rate limiting to correctly identify client IPs behind Firebase proxy
    app.set('trust proxy', 1)

    // Apply CORS with restricted origins
    app.use(
      cors({
        origin: [
          'https://orion-intel.web.app',
          'https://orion-ai-2790b.web.app',
          'http://localhost:5173',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-TRPC-Source'],
      })
    )

    // Apply Rate Limiting
    const { rateLimit } = await import('express-rate-limit')
    app.use(
      rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 50, // limit each IP to 50 requests per windowMs
        message: 'Too many requests from this IP, please try again after a minute',
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      })
    )

    // Mount tRPC middleware at the root
    const { getAuth } = await import('firebase-admin/auth')
    app.use(
      '/',
      trpcExpress.createExpressMiddleware({
        router: appRouter,
        createContext: async ({ req }) => {
          const token = req.headers.authorization?.replace('Bearer ', '')
          if (!token) return {}
          try {
            const decoded = await getAuth().verifyIdToken(token)
            return { uid: decoded.uid }
          } catch (e) {
            console.error('Token verification error:', e)
            return {}
          }
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

// ── Background Trigger ─────────────────────────────────────────────────
// Fires when a new object is finalized (uploaded) in the default GCS bucket.
// Only processes `.txt` files — all others are silently skipped.
export const processUploadedDocument = onObjectFinalized(
  { bucket: 'orion-ai-knowledge-base' },
  async event => {
    const filePath = event.data.name
    if (!filePath || !filePath.endsWith('.txt')) {
      console.log(`Skipping non-.txt file: ${filePath ?? '(no name)'}`)
      return
    }

    const fileName = filePath.split('/').pop() ?? filePath
    console.log(`Starting ingestion for ${fileName}`)

    // Lazy-load heavy dependencies (same pattern as the api function)
    const [
      { initializeApp, getApps },
      { getStorage },
      { chunkText, saveToFirestore },
      { embedTexts },
    ] = await Promise.all([
      import('firebase-admin/app'),
      import('firebase-admin/storage'),
      import('./lib/ingest.js'),
      import('./lib/gemini.js'),
    ])

    if (getApps().length === 0) {
      initializeApp()
    }

    // 1. Download file contents from GCS
    const bucket = getStorage().bucket(event.data.bucket)
    const [contents] = await bucket.file(filePath).download()
    const text = contents.toString('utf-8')
    console.log(`Downloaded ${fileName} (${text.length} characters)`)

    // 2. Chunk
    const chunks = chunkText(text, 1000, 200)
    console.log(`Chunked ${fileName} into ${chunks.length} chunks`)

    // 3. Embed (batched internally at 100 per request)
    const embeddings = await embedTexts(chunks)

    // 4. Save to Firestore (batched internally at 450 per WriteBatch)
    const docId = `doc_${Date.now()}`
    const title = fileName.replace(/\.txt$/, '')
    await saveToFirestore(docId, title, `gs://${event.data.bucket}/${filePath}`, chunks, embeddings)

    console.log(`Successfully processed ${chunks.length} chunks for ${fileName} (docId: ${docId})`)
  }
)
