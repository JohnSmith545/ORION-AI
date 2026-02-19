import { GoogleGenAI } from '@google/genai'

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT ?? 'orion-ai-487801'
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1'
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'gemini-embedding-001'
const CHAT_MODEL = process.env.CHAT_MODEL ?? 'gemini-2.5-flash'

// Configure the SDK to route through Vertex AI using Application Default Credentials.
process.env.GOOGLE_GENAI_USE_VERTEXAI = 'true'
process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID
process.env.GOOGLE_CLOUD_LOCATION = LOCATION

const ai = new GoogleGenAI({})

/**
 * Generates semantic embeddings for an array of strings.
 * Sends all texts in a single batched request to minimise API round-trips.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const resp = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts.map(t => ({ role: 'user', parts: [{ text: t }] })),
  })

  const vectors: number[][] = resp.embeddings?.map(e => e.values ?? []) ?? []

  if (vectors.length !== texts.length) {
    throw new Error(`Embedding count mismatch: got ${vectors.length}, expected ${texts.length}`)
  }

  return vectors
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

  const resp = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  const text = resp.text

  if (!text) {
    throw new Error('Gemini failed to generate a response')
  }

  return text
}
