import { GoogleGenAI, Type } from '@google/genai'
import type { Telemetry } from '@repo/shared'

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT ?? 'orion-ai-2790b'
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1'
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-004'
const CHAT_MODEL = process.env.CHAT_MODEL ?? 'gemini-2.5-flash'

// Configure the SDK to route through Vertex AI using Application Default Credentials.
process.env.GOOGLE_GENAI_USE_VERTEXAI = 'true'
process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID
process.env.GOOGLE_CLOUD_LOCATION = LOCATION

const ai = new GoogleGenAI({})

/** Result shape returned by generateGroundedResponse. */
export interface GroundedResponse {
  text: string
  telemetry: Telemetry | null
}

/**
 * Generates semantic embeddings for an array of strings.
 * Processes texts in sequential batches of 100 to avoid Gemini API
 * payload-size limits (413 Payload Too Large).
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const EMBED_BATCH_SIZE = 100
  const vectors: number[][] = []

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE)
    const resp = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: batch.map(t => ({ role: 'user' as const, parts: [{ text: t }] })),
    })

    const batchVectors: number[][] = resp.embeddings?.map(e => e.values ?? []) ?? []
    vectors.push(...batchVectors)
  }

  if (vectors.length !== texts.length) {
    throw new Error(`Embedding count mismatch: got ${vectors.length}, expected ${texts.length}`)
  }

  return vectors
}

/**
 * JSON response schema enforced by Gemini's structured output mode.
 * Ensures every response includes a `text` field and an optional `telemetry` object.
 */
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    text: {
      type: Type.STRING,
      description: 'Your conversational response to the user.',
    },
    telemetry: {
      type: Type.OBJECT,
      description:
        'Telemetry data for ANY astronomical topic discussed in the response — a specific celestial object, a general space concept (e.g., gamma rays, dark matter), a space mission, or a phenomenon. Set to null ONLY if the user is asking a completely non-space question (e.g., "hello" or "how are you").',
      nullable: true,
      properties: {
        name: {
          type: Type.STRING,
          description:
            'The name of the object or concept in uppercase (e.g., "GAMMA RAY", "BLACK HOLE", "JUPITER", "DARK MATTER").',
        },
        type: {
          type: Type.STRING,
          description:
            'The category (e.g., "Electromagnetic Radiation", "Theoretical Physics", "Gas Giant", "Space Mission").',
        },
        ra: {
          type: Type.STRING,
          description:
            'Right Ascension. If the topic is a general concept without specific coordinates, return "N/A" or "UNIVERSAL".',
        },
        dec: {
          type: Type.STRING,
          description:
            'Declination. If the topic is a general concept without specific coordinates, return "N/A" or "UNIVERSAL".',
        },
        distance: {
          type: Type.STRING,
          description:
            'Distance from Earth in LY or AU. If the topic is a general concept, return "N/A".',
        },
        description: {
          type: Type.STRING,
          description: 'A short 1-2 sentence scientific summary of the object or concept.',
        },
        imageKeyword: {
          type: Type.STRING,
          nullable: true,
          description:
            'Always provide a highly specific search keyword to query the NASA Image API for this topic (e.g., "Gamma Ray Burst", "Event Horizon", "Andromeda Galaxy", "International Space Station"). Only return null if it is a standard simple planet or star that should use a 3D sphere.',
        },
      },
    },
  },
  required: ['text'],
}

/**
 * Generates a structured response from Gemini that is grounded in the provided context blocks.
 * Returns both the conversational text and optional celestial telemetry data.
 */
export async function generateGroundedResponse(
  query: string,
  context: { text: string; sourceUri: string }[],
  history?: { role: 'user' | 'model'; text: string }[]
): Promise<GroundedResponse> {
  const contextBody = context
    .map((c, i) => `[Source ${i + 1}: ${c.sourceUri}]\n${c.text}`)
    .join('\n\n')

  const systemPrompt = `
You are ORION AI, an incredibly passionate and enthusiastic astronomy expert. Use the following context to answer the user's question.
If the context is empty or does not contain the answer, fall back to your general knowledge to answer the question gracefully. Do not mention that the context was empty.
Always cite your sources using the source numbers provided in brackets, like [Source 1].

CRITICAL RULE: Even if the user asks a completely unrelated question, says a simple greeting like "Hi", or the context is irrelevant, you MUST enthusiastically include a fascinating, related astronomy or space fact in your response.

TELEMETRY EXTRACTION RULE: When your response discusses ANY astronomical topic — a specific celestial object (star, planet, moon, galaxy, nebula), a general space concept (gamma rays, dark matter, cosmic microwave background), a space mission (Apollo, Voyager, James Webb), or a phenomenon (supernova, gravitational lensing, solar wind) — you MUST populate the "telemetry" field. For general concepts without exact coordinates, use "N/A" or "UNIVERSAL" for ra, dec, and distance. Set "telemetry" to null ONLY if the user is asking a completely non-space question (e.g., "hello", "how are you", or other non-astronomical small talk).

CONTEXT:
${contextBody}

STRICT INSTRUCTIONS:
1. Maintain an energetic, space-loving tone.
2. ALWAYS include a random space fact.
3. Use markdown for formatting in the "text" field.
4. Populate "telemetry" for ANY space-related topic. Only set it to null for completely non-space questions.
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
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  })

  const raw = resp.text

  if (!raw) {
    throw new Error('Gemini failed to generate a response')
  }

  // Parse the structured JSON output. Fallback gracefully if parsing fails.
  try {
    const parsed = JSON.parse(raw) as { text: string; telemetry?: Telemetry | null }
    return {
      text: parsed.text,
      telemetry: parsed.telemetry ?? null,
    }
  } catch {
    // If JSON parsing fails, treat the raw output as plain text with no telemetry.
    return {
      text: raw,
      telemetry: null,
    }
  }
}
