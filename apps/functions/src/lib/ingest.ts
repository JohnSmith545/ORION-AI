import { TRPCError } from '@trpc/server'
import { getFirestore, FieldValue, Timestamp, WriteBatch } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { embedTexts } from './gemini.js'

/**
 * Fetches raw text content from an HTTP/HTTPS URL.
 * Includes SSRF protection to prevent access to internal/private resources.
 */
export async function fetchContent(url: string): Promise<string> {
  const parsedUrl = new URL(url)

  // 1. Force HTTPS
  if (parsedUrl.protocol !== 'https:') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid protocol. Only HTTPS is allowed for ingestion.',
    })
  }

  // 2. Block private/internal IP spaces and GCP metadata server
  const forbiddenHosts = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^169\.254\./, // 169.254.0.0/16 (Link-local / Metadata)
    /metadata\.google\.internal/, // GCP Metadata
  ]

  const hostname = parsedUrl.hostname.toLowerCase()
  if (forbiddenHosts.some(pattern => pattern.test(hostname))) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Access to the specified host is forbidden (SSRF protection).',
    })
  }

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

  // 2. Save chunks as sub-collection in batches of 450.
  //    Firestore limits each WriteBatch to 500 operations — 450 gives a safety
  //    margin so we never hit the hard cap, even with large documents.
  //    sourceUri is denormalized onto each chunk so retrieval never needs
  //    a second Firestore read to look up the parent document.
  const BATCH_SIZE = 450
  const batches: WriteBatch[] = []

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = db.batch()
    const slice = chunks.slice(i, i + BATCH_SIZE)

    slice.forEach((text, sliceIndex) => {
      const chunkRef = docRef.collection('chunks').doc()
      batch.set(chunkRef, {
        text,
        sourceUri,
        embedding: FieldValue.vector(embeddings[i + sliceIndex]),
        index: i + sliceIndex,
      })
    })

    batches.push(batch)
  }

  await Promise.all(batches.map(b => b.commit()))
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
