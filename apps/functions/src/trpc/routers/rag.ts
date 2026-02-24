import { protectedProcedure, adminProcedure, router } from '../trpc.js'
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
  chat: protectedProcedure.input(ChatQuerySchema).mutation(async ({ input }) => {
    try {
      const { question } = input

      // 1. Convert the user's question into a mathematical vector
      const vector = await getQueryEmbedding(question)

      // 2. Search your database for the context chunks
      const context = await retrieveContext(vector, 3)

      // 3. Send to Gemini with conversation history for multi-turn context
      const {
        text,
        telemetry: rawTelemetry,
        usedSources,
      } = await generateGroundedResponse(question, context, input.history)
      let telemetry = rawTelemetry

      // 4. If Gemini flagged this as a complex object, fetch a NASA image
      if (telemetry?.imageKeyword) {
        try {
          const nasaRes = await fetch(
            `https://images-api.nasa.gov/search?q=${encodeURIComponent(telemetry.imageKeyword)}&media_type=image`
          )
          if (nasaRes.ok) {
            const nasaJson = (await nasaRes.json()) as {
              collection?: { items?: { links?: { href?: string }[] }[] }
            }
            const imageUrl = nasaJson?.collection?.items?.[0]?.links?.[0]?.href
            if (imageUrl) {
              telemetry = { ...telemetry, imageUrl }
            }
          }
        } catch {
          // NASA API failure is non-fatal — frontend falls back to 3D viewer
        }
      }

      // 5. Build citations from Gemini's structured usedSources array
      const citedUris = usedSources
        .filter(n => n >= 1 && n <= context.length)
        .map(n => context[n - 1].sourceUri)

      return {
        response: text,
        citations: citedUris.length > 0 ? Array.from(new Set(citedUris)) : undefined,
        telemetry,
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to generate AI response')
    }
  }),

  /**
   * Trigger document ingestion.
   */
  ingest: adminProcedure.input(IngestDocSchema).mutation(async ({ input }) => {
    const { sourceUri, title, sourceType } = input
    const docId = await ingestDocument(sourceUri, title || 'Untitled Document', sourceType)

    return {
      success: true,
      docId,
      message: `Document ingested successfully (${docId})`,
    }
  }),
})
