import { VertexAI } from '@google-cloud/vertexai'

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'orion-ai-487801'
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'

// Initialize Vertex AI
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION })
const embeddingModel = vertexAI.getGenerativeModel({ model: 'text-embedding-004' })
const generativeModel = vertexAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    maxOutputTokens: 2048,
    temperature: 0.2,
  },
})

/**
 * Generates semantic embeddings for an array of strings.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const promises = texts.map(async text => {
    // The base GenerativeModel type in the SDK does not expose embedContent
    // at the type level, but it works at runtime for embedding models.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (embeddingModel as any).embedContent({
      content: { parts: [{ text }], role: 'user' },
    })

    if (!response.embeddings || response.embeddings.length === 0) {
      throw new Error('No embeddings returned from Vertex AI')
    }
    return response.embeddings[0].values
  })

  return Promise.all(promises)
}

/**
 * Generates a response from Gemini that is grounded in the provided context blocks.
 */
export async function generateGroundedResponse(
  query: string,
  context: { text: string; sourceUri: string }[]
): Promise<string> {
  const contextBody = context
    .map((c, i) => `[Source ${i + 1}: ${c.sourceUri}]\n${c.text}`)
    .join('\n\n')

  const prompt = `
You are ORION AI, a helpful assistant. Use the following context to answer the user's question. 
If the answer is not in the context, say you don't know based on the provided data. 
Always cite your sources using the source numbers provided in brackets, like [Source 1].

CONTEXT:
${contextBody}

USER QUESTION:
${query}

STRICT INSTRUCTIONS:
1. Only use the provided context.
2. Maintain a professional tone.
3. Use markdown for formatting.
    `.trim()

  const response = await generativeModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  const result = response.response
  const candidate = result.candidates?.[0]
  const textResult = candidate?.content?.parts?.[0]?.text

  if (!textResult) {
    throw new Error('Gemini failed to generate a response')
  }

  return textResult
}
