import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import type { IVectorStore, VectorSearchResult } from '../ports/vector-store.js'

/**
 * Firestore implementation of IVectorStore.
 *
 * Uses Firestore's native `findNearest` (kNN) on the `chunks` collection
 * group with COSINE distance measure. Swap this for a VertexVectorStore
 * adapter when moving to production-grade Vertex AI Vector Search.
 */
export const firestoreVectorStore: IVectorStore = {
  async findNearest(vector: number[], limit: number): Promise<VectorSearchResult[]> {
    const db = getFirestore()

    // select() limits the fields returned by Firestore to only what we need.
    // Without it, the full embedding vector (~24 KB per chunk) would be
    // downloaded and deserialized on every chat query then silently discarded.
    const query = db
      .collectionGroup('documentChunks')
      .select('text', 'sourceUri')
      .findNearest({
        vectorField: 'embedding',
        queryVector: FieldValue.vector(vector),
        limit,
        distanceMeasure: 'COSINE',
        distanceResultField: 'distance',
      })

    const snapshot = await query.get()

    return snapshot.docs.map(doc => {
      const data = doc.data() as { text: string; sourceUri: string; distance?: number }
      return {
        text: data.text,
        sourceUri: data.sourceUri,
        distance: data.distance,
      }
    })
  },
}
