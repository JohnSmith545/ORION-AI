import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { embedTexts } from './gemini.js'

/**
 * Fetches raw text content from an HTTP/HTTPS URL.
 */
export async function fetchContent(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.statusText}`)
  }
  return response.text()
}

/**
 * Fetches raw text content from a Google Cloud Storage URI (gs://bucket/path).
 *
 * Uses firebase-admin/storage — no extra dependency needed, and authentication
 * is handled automatically by the same service account that runs the function.
 * This is the cost-preferred source: GCS is reliable, in-project, and avoids
 * dependence on external URLs that can go down.
 */
export async function fetchFromGCS(gcsUri: string): Promise<string> {
  const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/)
  if (!match) throw new Error(`Invalid GCS URI: ${gcsUri}`)
  const [, bucketName, filePath] = match

  const file = getStorage().bucket(bucketName).file(filePath)
  const [contents] = await file.download()

  if (!contents || contents.length === 0) {
    throw new Error(`GCS file is empty or not found: ${gcsUri}`)
  }

  return contents.toString('utf-8')
}

/**
 * Splits a string into overlapping chunks of a specific size.
 */
export function chunkText(text: string, size: number, overlap: number): string[] {
  if (size <= 0) throw new Error('Chunk size must be greater than 0')
  if (overlap >= size) throw new Error('Overlap must be less than chunk size')

  const chunks: string[] = []
  let start = 0

  if (text.length <= size) {
    return [text]
  }

  while (start < text.length) {
    const end = Math.min(start + size, text.length)
    chunks.push(text.substring(start, end))
    if (end === text.length) break
    start = start + (size - overlap)
  }

  return chunks
}

/**
 * Saves document metadata and its embedded chunks to Firestore.
 */
export async function saveToFirestore(
  docId: string,
  title: string,
  sourceUri: string,
  chunks: string[],
  embeddings: number[][]
): Promise<void> {
  const db = getFirestore()
  const docRef = db.collection('docs').doc(docId)

  // 1. Save main document metadata
  await docRef.set({
    title,
    sourceUri,
    chunkCount: chunks.length,
    createdAt: Timestamp.now(),
  })

  // 2. Save chunks as sub-collection.
  // sourceUri is denormalized onto each chunk so retrieval never needs
  // a second Firestore read to look up the parent document.
  const batch = db.batch()
  chunks.forEach((text, index) => {
    const chunkRef = docRef.collection('chunks').doc()
    batch.set(chunkRef, {
      text,
      sourceUri,
      embedding: FieldValue.vector(embeddings[index]),
      index,
    })
  })

  await batch.commit()
}

/**
 * Full ingestion workflow: fetch -> chunk -> embed -> save.
 *
 * sourceType controls the fetch strategy:
 *   'api' → plain HTTP/HTTPS fetch (external URL)
 *   'gcs' → Google Cloud Storage fetch (gs://bucket/path)
 */
export async function ingestDocument(
  url: string,
  title: string,
  sourceType: 'api' | 'gcs' = 'api'
): Promise<string> {
  const docId = `doc_${Date.now()}`

  const content = sourceType === 'gcs' ? await fetchFromGCS(url) : await fetchContent(url)
  const chunks = chunkText(content, 1000, 200)
  const embeddings = await embedTexts(chunks)

  await saveToFirestore(docId, title, url, chunks, embeddings)

  return docId
}
