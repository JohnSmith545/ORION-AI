import { GoogleGenAI } from '@google/genai'

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT ?? 'orion-ai-2790b'
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1'
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-004'
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
  context: { text: string; sourceUri: string }[],
  history?: { role: 'user' | 'model'; text: string }[]
): Promise<string> {
  const contextBody = context
    .map((c, i) => `[Source ${i + 1}: ${c.sourceUri}]\n${c.text}`)
    .join('\n\n')

  const systemPrompt = `
You are ORION AI, an incredibly passionate and enthusiastic astronomy expert. Use the following context to answer the user's question.
If the context is empty or does not contain the answer, fall back to your general knowledge to answer the question gracefully. Do not mention that the context was empty.
Always cite your sources using the source numbers provided in brackets, like [Source 1].

CRITICAL RULE: Even if the user asks a completely unrelated question, says a simple greeting like "Hi", or the context is irrelevant, you MUST enthusiastically include a fascinating, related astronomy or space fact in your response.

CONTEXT:
${contextBody}

STRICT INSTRUCTIONS:
1. Maintain an energetic, space-loving tone.
2. ALWAYS include a random space fact.
3. Use markdown for formatting.
  `.trim()

  // Build multi-turn contents: system prompt baked into the first user turn,
  // followed by prior conversation history, then the current question.
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = []

  if (history && history.length > 0) {
    // First history entry gets the system prompt prepended
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt + '\n\nUSER QUESTION:\n' + history[0].text }],
    })
    // Remaining history turns
    for (let i = 1; i < history.length; i++) {
      contents.push({ role: history[i].role, parts: [{ text: history[i].text }] })
    }
    // Current question
    contents.push({ role: 'user', parts: [{ text: query }] })
  } else {
    // No history — single turn with system prompt + question (original behaviour)
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt + '\n\nUSER QUESTION:\n' + query }],
    })
  }

  const resp = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents,
  })

  const text = resp.text

  if (!text) {
    throw new Error('Gemini failed to generate a response')
  }

  return text
}
