import { describe, it, expect, vi, afterEach } from 'vitest'
import { embedTexts, generateGroundedResponse } from './gemini.js'

// Mock the Google Gen AI SDK
const mockEmbedContent = vi.fn()
const mockGenerateContent = vi.fn().mockResolvedValue({
  text: JSON.stringify({ text: 'Grounded AI response with citations.', telemetry: null }),
})

vi.mock('@google/genai', async importOriginal => {
  const actual = await importOriginal<typeof import('@google/genai')>()
  return {
    ...actual,
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        embedContent: (...args: unknown[]) => mockEmbedContent(...args),
        generateContent: (...args: unknown[]) => mockGenerateContent(...args),
      },
    })),
  }
})

describe('Gemini Adapter', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('embedTexts', () => {
    it('should generate embeddings for an array of strings', async () => {
      mockEmbedContent.mockResolvedValueOnce({
        embeddings: [{ values: new Array(3072).fill(0.1) }],
      })

      const texts = ['hello world']
      const vectors = await embedTexts(texts)
      expect(vectors.length).toBe(1)
      expect(vectors[0].length).toBe(3072)
    })

    it('should batch texts in groups of 100 and concatenate results', async () => {
      // 150 texts → 2 API calls (100 + 50)
      const totalTexts = 150
      const texts = Array.from({ length: totalTexts }, (_, i) => `text-${i}`)

      // First call returns 100 embeddings, second returns 50
      mockEmbedContent
        .mockResolvedValueOnce({
          embeddings: Array.from({ length: 100 }, () => ({ values: [0.1, 0.2] })),
        })
        .mockResolvedValueOnce({
          embeddings: Array.from({ length: 50 }, () => ({ values: [0.3, 0.4] })),
        })

      const vectors = await embedTexts(texts)

      expect(mockEmbedContent).toHaveBeenCalledTimes(2)
      expect(vectors.length).toBe(totalTexts)
      // First batch returns [0.1, 0.2], second returns [0.3, 0.4]
      expect(vectors[0]).toEqual([0.1, 0.2])
      expect(vectors[100]).toEqual([0.3, 0.4])
    })
  })

  describe('generateGroundedResponse', () => {
    it('should generate a response using provided context', async () => {
      const query = 'Tell me about ORION AI'
      const context = [{ text: 'ORION AI uses Vertex AI.', sourceUri: 'https://docs.ai' }]

      const result = await generateGroundedResponse(query, context)

      expect(result.text).toBe('Grounded AI response with citations.')
      expect(result.telemetry).toBeNull()
    })

    it('should throw Error when Gemini returns null/empty text', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: null })

      const context = [{ text: 'context', sourceUri: 'https://example.com' }]
      await expect(generateGroundedResponse('query', context)).rejects.toThrow(
        'Gemini failed to generate a response'
      )
    })

    it('should return plain text fallback when JSON parsing fails', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'This is not valid JSON' })

      const context = [{ text: 'context', sourceUri: 'https://example.com' }]
      const result = await generateGroundedResponse('query', context)

      expect(result.text).toBe('This is not valid JSON')
      expect(result.telemetry).toBeNull()
      expect(result.usedSources).toEqual([])
      expect(result.contextIsRelevant).toBe(false)
    })

    it('should hard-override usedSources to [] when contextIsRelevant is false', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          text: 'Some answer',
          contextIsRelevant: false,
          usedSources: [1, 2, 3],
          telemetry: null,
        }),
      })

      const context = [{ text: 'unrelated context', sourceUri: 'https://example.com' }]
      const result = await generateGroundedResponse('query', context)

      expect(result.usedSources).toEqual([])
      expect(result.contextIsRelevant).toBe(false)
    })

    it('should preserve usedSources when contextIsRelevant is true', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          text: 'Great answer from sources',
          contextIsRelevant: true,
          usedSources: [1, 3],
          telemetry: null,
        }),
      })

      const context = [{ text: 'relevant', sourceUri: 'https://example.com' }]
      const result = await generateGroundedResponse('query', context)

      expect(result.usedSources).toEqual([1, 3])
      expect(result.contextIsRelevant).toBe(true)
    })

    it('should handle missing optional fields gracefully', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          text: 'Response without optional fields',
          contextIsRelevant: true,
        }),
      })

      const context = [{ text: 'context', sourceUri: 'https://example.com' }]
      const result = await generateGroundedResponse('query', context)

      expect(result.text).toBe('Response without optional fields')
      expect(result.telemetry).toBeNull()
      expect(result.usedSources).toEqual([])
    })

    it('should pass conversation history to contents array', async () => {
      const context = [{ text: 'context', sourceUri: 'https://example.com' }]
      const history = [
        { role: 'user' as const, text: 'First question' },
        { role: 'model' as const, text: 'First answer' },
      ]

      await generateGroundedResponse('Follow up question', context, history)

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            { role: 'user', parts: [{ text: 'First question' }] },
            { role: 'model', parts: [{ text: 'First answer' }] },
          ]),
        })
      )
    })
  })

  describe('embedTexts - Error Cases', () => {
    it('should throw when embedding count does not match text count', async () => {
      // Return only 1 embedding for 2 texts
      mockEmbedContent.mockResolvedValueOnce({
        embeddings: [{ values: [0.1, 0.2] }],
      })

      await expect(embedTexts(['text1', 'text2'])).rejects.toThrow('Embedding count mismatch')
    })
  })
})
