/**
 * Hexagonal Port: IVectorStore
 *
 * Defines the contract that any vector storage backend must fulfill.
 * The business logic in rag.ts depends on this interface, never on a
 * concrete implementation — making it trivial to swap Firestore for
 * Vertex AI Vector Search (or a test double) without touching core logic.
 */
export interface IVectorStore {
  findNearest(vector: number[], limit: number): Promise<{ text: string; sourceUri: string }[]>
}
