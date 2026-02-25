import { getFirestore, FieldValue, type QueryDocumentSnapshot } from 'firebase-admin/firestore'
import type { IVectorStore } from '../ports/vector-store.js'

/**
 * Firestore implementation of IVectorStore.
 *
 * Uses Firestore's native `findNearest` (kNN) on the `documentChunks` collection
 * group with COSINE distance measure. The `distanceResultField` option returns
 * the cosine distance for each result, enabling deduplication checks.
 *
 * COSINE distance: 0 = identical, 2 = opposite.
 * A similarity score of 1 - distance gives: 1.0 = identical, 0.0 = orthogonal.
 */
export const firestoreVectorStore: IVectorStore = {
  async findNearest(
    vector: number[],
    limit: number
  ): Promise<{ text: string; sourceUri: string; distance?: number }[]> {
    const db = getFirestore()

    // select() limits the fields returned by Firestore to only what we need.
    // Without it, the full embedding vector (~24 KB per chunk) would be
    // downloaded and deserialized on every chat query then silently discarded.
    const query = db
      .collectionGroup('documentChunks')
      .select('text', 'sourceUri', 'vector_distance')
      .findNearest('embedding', FieldValue.vector(vector), {
        limit,
        distanceMeasure: 'COSINE',
        // @ts-expect-error: distanceResultField is supported in 13.x but missing in types
        distanceResultField: 'vector_distance',
      })

    const snapshot = await query.get()

    return snapshot.docs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data() as { text: string; sourceUri: string; vector_distance?: number }
      return {
        text: data.text,
        sourceUri: data.sourceUri,
        distance: data.vector_distance,
      }
    })
  },
}
