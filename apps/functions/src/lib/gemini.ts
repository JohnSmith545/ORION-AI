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

export const ai = new GoogleGenAI({})

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
  history?: { role: 'user' | 'model'; text: string }[],
  files?: { data: string; mimeType: string }[] // UPDATED TO ARRAY
): Promise<GroundedResponse> {
  const contextBody = context
    .map((c, i) => `[Source ${i + 1}: ${c.sourceUri}]\n${c.text}`)
    .join('\n\n')

  const systemPrompt = `
You are ORION AI, an incredibly passionate and enthusiastic astronomy expert. You will be provided with CONTEXT snippets to help answer the user's question.

CITATION & CONTEXT RULES:
- First, determine if the CONTEXT is relevant to the query and set "contextIsRelevant" to true or false.
- IF RELEVANT (true): Use the information, cite it using [Source 1], and list the source numbers in "usedSources".
- IF IRRELEVANT (false): COMPLETELY IGNORE THE CONTEXT. Answer using your own built-in knowledge.
- IF ANALYZING AN IMAGE OR PDF: You MUST cross-reference your visual analysis with the CONTEXT provided to give the most accurate, grounded answer. Do not ignore the context!

THE SPACE PIVOT RULE:
- If the user asks about an astronomical topic, answer directly and concisely. Do NOT overshare unnecessary facts.
- If the user asks a completely NON-SPACE related question, answer politely, then pivot with a brief (1-2 sentences max) space fact to steer the conversation back.

TELEMETRY EXTRACTION RULE: 
- You MUST extract telemetry data specifically for the PRIMARY SUBJECT of the user's question or the uploaded image.
- CRITICAL: Do NOT extract telemetry for the secondary "fun fact" or pivot topic. The telemetry must match what the user is actually asking about! Set to null ONLY if the user is asking a non-space question.

CONTEXT:
${contextBody}
  `.trim()

  // Build the current turn parts — text first, then optional file attachment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentTurnParts: any[] = [{ text: systemPrompt + '\n\nUSER QUESTION:\n' + query }]

  // Inject multiple files
  if (files && files.length > 0) {
    files.forEach(f => {
      currentTurnParts.push({
        inlineData: { data: f.data, mimeType: f.mimeType },
      })
    })
  }

  // Build multi-turn contents: history is passed exactly as it occurred,
  // and the system prompt (with CURRENT context) is prepended to the CURRENT question.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents: { role: 'user' | 'model'; parts: any[] }[] = []

  if (history && history.length > 0) {
    // Push the history exactly as it occurred
    for (let i = 0; i < history.length; i++) {
      contents.push({ role: history[i].role, parts: [{ text: history[i].text }] })
    }
    // Append current turn with system prompt + question + optional file
    contents.push({ role: 'user', parts: currentTurnParts })
  } else {
    // No history — single turn with system prompt + question + optional file
    contents.push({ role: 'user', parts: currentTurnParts })
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
