import { describe, it, expect, vi } from 'vitest'
import { embedTexts, generateGroundedResponse } from './gemini.js'

// Mock the Google Gen AI SDK
vi.mock('@google/genai', () => {
  const embedContent = vi.fn().mockResolvedValue({
    embeddings: [{ values: new Array(3072).fill(0.1) }],
  })

  const generateContent = vi.fn().mockResolvedValue({
    text: 'Grounded AI response with citations.',
  })

  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: { embedContent, generateContent },
    })),
  }
})

describe('Gemini Adapter', () => {
  describe('embedTexts', () => {
    it('should generate embeddings for an array of strings', async () => {
      const texts = ['hello world']
      const vectors = await embedTexts(texts)
      expect(vectors.length).toBe(1)
      expect(vectors[0].length).toBe(3072)
    })
  })

  describe('generateGroundedResponse', () => {
    it('should generate a response using provided context', async () => {
      const query = 'Tell me about ORION AI'
      const context = [{ text: 'ORION AI uses Vertex AI.', sourceUri: 'https://docs.ai' }]

      const response = await generateGroundedResponse(query, context)

      expect(response).toBe('Grounded AI response with citations.')
    })
  })
})
