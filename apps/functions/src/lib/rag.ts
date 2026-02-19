import { embedTexts } from './gemini.js'
import { firestoreVectorStore } from './firestore-vector-store.js'
import type { IVectorStore } from '../ports/vector-store.js'

/**
 * Encapsulates the logic for converting a user query into a semantic vector.
 */
export async function getQueryEmbedding(query: string): Promise<number[]> {
  const [vector] = await embedTexts([query])
  return vector
}

/**
 * Performs a vector search to find relevant context chunks.
 *
 * Accepts an IVectorStore so the storage backend can be swapped or mocked
 * without changing this function. Defaults to the Firestore implementation.
 */
export async function retrieveContext(
  vector: number[],
  limit: number = 5,
  store: IVectorStore = firestoreVectorStore
): Promise<{ text: string; sourceUri: string }[]> {
  return store.findNearest(vector, limit)
}
