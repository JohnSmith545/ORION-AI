import { publicProcedure, router } from '../trpc'
import { ChatQuerySchema, IngestDocSchema } from '@repo/shared'
import { getQueryEmbedding, retrieveContext } from '../../lib/rag.js'
import { generateGroundedResponse } from '../../lib/gemini.js'
import { ingestDocument } from '../../lib/ingest.js'

export const ragRouter = router({
  /**
   * Main chat procedure: Retrieval-Augmented Generation.
   */
  chat: publicProcedure.input(ChatQuerySchema).mutation(async ({ input }) => {
    const { question } = input

    // 1. Embed the query
    const queryVector = await getQueryEmbedding(question)

    // 2. Retrieve context from Firestore
    const context = await retrieveContext(queryVector)

    // 3. Generate grounded response
    const response = await generateGroundedResponse(question, context)

    return {
      response,
      citations: context.map(c => c.sourceUri),
    }
  }),

  /**
   * Trigger document ingestion.
   */
  ingest: publicProcedure.input(IngestDocSchema).mutation(async ({ input }) => {
    const { sourceUri, title, sourceType } = input
    const docId = await ingestDocument(sourceUri, title || 'Untitled Document', sourceType)

    return {
      success: true,
      docId,
    }
  }),
})
