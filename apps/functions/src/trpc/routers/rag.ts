import { publicProcedure, router } from '../trpc'
import { ChatQuerySchema, IngestDocSchema } from '@repo/shared'
import { getQueryEmbedding, retrieveContext } from '../../lib/rag.js'
import { generateGroundedResponse } from '../../lib/gemini.js'
import { ingestDocument } from '../../lib/ingest.js'

export const ragRouter = router({
  /**
   * Main chat procedure: Retrieval-Augmented Generation.
   * 1. Embed the user's question into a vector
   * 2. Search the database for relevant context chunks
   * 3. Send to Gemini to generate a grounded response
   */
  chat: publicProcedure.input(ChatQuerySchema).mutation(async ({ input }) => {
    try {
      const { question } = input

      // 1. Convert the user's question into a mathematical vector
      const vector = await getQueryEmbedding(question)

      // 2. Search your database for the context chunks
      const context = await retrieveContext(vector, 3)

      // 3. Send to Gemini
      const response = await generateGroundedResponse(question, context)

      // 4. Return exactly what DashboardChatSection expects
      return {
        response,
        citations: Array.from(new Set(context.map(c => c.sourceUri))),
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to generate AI response')
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
