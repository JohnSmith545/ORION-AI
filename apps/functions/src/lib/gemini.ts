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
  usedSources: number[]
  contextIsRelevant: boolean
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
    usedSources: {
      type: Type.ARRAY,
      description:
        'An array of the source numbers you actually used and cited in your response. For example, if you cited [Source 1] and [Source 3], return [1, 3]. If you did not use any sources, return an empty array [].',
      items: {
        type: Type.INTEGER,
      },
    },
    contextIsRelevant: {
      type: Type.BOOLEAN,
      description:
        'Analyze the user query and the CONTEXT. Is the context actually helpful and relevant to answering the query? Return true if yes, return false if it is completely unrelated.',
    },
  },
  required: ['text', 'contextIsRelevant', 'usedSources'],
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
You are ORION AI, an incredibly passionate and enthusiastic astronomy expert. You will be provided with CONTEXT snippets to help answer the user's question.

CITATION & CONTEXT RULES:
- First, determine if the CONTEXT is relevant to the query and set "contextIsRelevant" to true or false.
- IF RELEVANT (true): Use the information, cite it using [Source 1], and list the source numbers in "usedSources".
- IF IRRELEVANT (false): COMPLETELY IGNORE THE CONTEXT. Answer using your own built-in knowledge. Do NOT output any source brackets in the text, and return an empty [] for "usedSources".

THE SPACE PIVOT RULE:
- If the user asks about an astronomical topic, answer it and include a brief, related space fact.
- If the user asks a completely NON-SPACE related question (e.g., cooking, programming, general greetings, etc.), answer their query politely, but then you MUST pivot and provide a VERY LONG, highly detailed, and wildly enthusiastic fun fact about astrophysics or the cosmos to drag the conversation back to space.

TELEMETRY EXTRACTION RULE: When your response discusses ANY astronomical topic — a specific celestial object, a general space concept, a space mission, or a phenomenon — you MUST populate the "telemetry" field. For general concepts without exact coordinates, use "N/A" or "UNIVERSAL" for ra, dec, and distance. Set "telemetry" to null ONLY if the user is asking a completely non-space question.

CONTEXT:
${contextBody}
  `.trim()

  // Build multi-turn contents: history is passed exactly as it occurred,
  // and the system prompt (with CURRENT context) is prepended to the CURRENT question.
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = []

  if (history && history.length > 0) {
    // Push the history exactly as it occurred
    for (let i = 0; i < history.length; i++) {
      contents.push({ role: history[i].role, parts: [{ text: history[i].text }] })
    }
    // Prepend the system prompt and CURRENT context to the CURRENT question
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt + '\n\nUSER QUESTION:\n' + query }],
    })
  } else {
    // No history — single turn with system prompt + question
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
    const parsed = JSON.parse(raw) as {
      text: string
      telemetry?: Telemetry | null
      usedSources?: number[]
      contextIsRelevant?: boolean
    }

    // THE FAILSAFE: If Gemini admits the context is irrelevant, we hard-override and wipe the sources
    // so they never reach the frontend, even if it hallucinated numbers in the array.
    const safeUsedSources = parsed.contextIsRelevant === false ? [] : parsed.usedSources ?? []

    return {
      text: parsed.text,
      telemetry: parsed.telemetry ?? null,
      usedSources: safeUsedSources,
      contextIsRelevant: parsed.contextIsRelevant ?? false,
    }
  } catch {
    // If JSON parsing fails, treat the raw output as plain text with no telemetry.
    return {
      text: raw,
      telemetry: null,
      usedSources: [],
      contextIsRelevant: false,
    }
  }
}
