/**
 * ════════════════════════════════════════════════════════════════════════
 *  seed-ph-space.ts — Philippine Space & Astrophysics RAG seed script
 * ════════════════════════════════════════════════════════════════════════
 *
 *  Fetches data from Wikipedia (PH space missions) and NASA NTRS
 *  (astrophysics), converts it to natural language chunks, embeds them
 *  via Vertex AI, and saves directly to Firestore.
 *
 *  FREE-TIER SAFETY:
 *  ▸ Hard cap of 500 chunks per execution.
 *  ▸ 2-second delay between embedding batches (100 texts each).
 *  ▸ Topics processed sequentially to keep memory low.
 *
 *  HOW TO RUN (from apps/functions/):
 *  ──────────────────────────────────
 *  Make sure you're authenticated with GCP:
 *
 *    gcloud auth application-default login
 *
 *  Then run with tsx:
 *
 *    npx tsx src/scripts/seed-ph-space.ts
 *
 *  Or with the Firebase emulators (Firestore):
 *
 *    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx src/scripts/seed-ph-space.ts
 *
 * ════════════════════════════════════════════════════════════════════════
 */

import { initializeApp, getApps } from 'firebase-admin/app'
import { embedTexts } from '../lib/gemini.js'
import { saveToFirestore } from '../lib/ingest.js'

// ── Constants ──────────────────────────────────────────────────────────
const MAX_TOTAL_CHUNKS = 500
const EMBED_BATCH_SIZE = 100
const RATE_LIMIT_DELAY_MS = 2000

// ── Types ──────────────────────────────────────────────────────────────

/** Shape of a single result from the NASA NTRS citations API. */
interface NTRSResult {
  title?: string
  abstract?: string
  description?: string
}

/** Shape of the NASA NTRS search response. */
interface NTRSResponse {
  results?: NTRSResult[]
}

/** Shape of a Wikipedia REST API summary response. */
interface WikipediaSummary {
  title: string
  extract: string
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Delays execution for the given number of milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetches a Wikipedia article summary via the REST API.
 * Returns an array of text chunks from the extracted summary.
 */
async function fetchWikipediaSummary(
  articleTitle: string
): Promise<{ chunks: string[]; sourceUri: string }> {
  const encoded = encodeURIComponent(articleTitle.replace(/ /g, '_'))
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`

  console.log(`   📖 Fetching Wikipedia: "${articleTitle}"...`)
  const res = await fetch(url)

  if (!res.ok) {
    console.warn(`   ⚠️  Wikipedia fetch failed for "${articleTitle}": ${res.status}`)
    return { chunks: [], sourceUri: url }
  }

  const data = (await res.json()) as WikipediaSummary
  if (!data.extract || data.extract.length < 20) {
    console.warn(`   ⚠️  No meaningful content for "${articleTitle}"`)
    return { chunks: [], sourceUri: url }
  }

  // Create a well-formed chunk with the title as context
  const chunk = `${data.title}\n\n${data.extract}`
  console.log(`   ✅ Got 1 chunk for "${articleTitle}" (${chunk.length} chars)`)
  return { chunks: [chunk], sourceUri: `https://en.wikipedia.org/wiki/${encoded}` }
}

/**
 * Fetches from the NASA NTRS API and returns an array of text chunks.
 * Each chunk is a single abstract/description, prepended with its title.
 */
async function fetchNTRSTopic(
  query: string,
  topicLabel: string,
  maxResults = 30
): Promise<{ chunks: string[]; sourceUri: string }> {
  const encodedQuery = encodeURIComponent(query)
  const url = `https://ntrs.nasa.gov/api/citations/search?q=${encodedQuery}`

  console.log(`\n🔭 Fetching NTRS: "${topicLabel}"...`)
  const res = await fetch(url)

  if (!res.ok) {
    console.warn(`   ⚠️  NTRS fetch failed for "${topicLabel}": ${res.status}`)
    return { chunks: [], sourceUri: url }
  }

  const data = (await res.json()) as NTRSResponse
  const results = (data.results ?? []).slice(0, maxResults)

  const chunks: string[] = []
  for (const item of results) {
    const body = item.abstract ?? item.description
    if (!body) continue
    const title = item.title ?? 'Untitled'
    chunks.push(`${title}\n\n${body}`)
  }

  console.log(`   ✅ Got ${chunks.length} chunks for "${topicLabel}"`)
  return { chunks, sourceUri: `https://ntrs.nasa.gov/search?q=${encodedQuery}` }
}

// ── Rate-Limited Embed & Save ──────────────────────────────────────────

/**
 * Embeds an array of text chunks with rate limiting and saves to Firestore.
 * Processes embeddings in batches of 100 with a 2-second delay between batches.
 */
async function embedAndSaveWithRateLimit(
  docId: string,
  title: string,
  sourceUri: string,
  chunks: string[]
): Promise<number> {
  if (chunks.length === 0) {
    console.log(`   ⚠️  No chunks for "${title}" — skipping.`)
    return 0
  }

  console.log(
    `   📐 Embedding ${chunks.length} chunks for "${title}" (batch size: ${EMBED_BATCH_SIZE})...`
  )

  const allEmbeddings: number[][] = []

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE)
    const batchNum = Math.floor(i / EMBED_BATCH_SIZE) + 1
    const totalBatches = Math.ceil(chunks.length / EMBED_BATCH_SIZE)

    console.log(`      Batch ${batchNum}/${totalBatches} (${batch.length} texts)...`)
    const embeddings = await embedTexts(batch)
    allEmbeddings.push(...embeddings)

    // Rate limit: wait between batches (skip after the last batch)
    if (i + EMBED_BATCH_SIZE < chunks.length) {
      console.log(`      ⏳ Rate limiting — waiting ${RATE_LIMIT_DELAY_MS / 1000}s...`)
      await delay(RATE_LIMIT_DELAY_MS)
    }
  }

  console.log(`   💾 Saving to Firestore as docId="${docId}"...`)
  await saveToFirestore(docId, title, sourceUri, chunks, allEmbeddings)

  console.log(`   ✅ Done! ${chunks.length} chunks saved for "${title}".`)
  return chunks.length
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  ORION AI — Philippine Space & Astrophysics Seed')
  console.log(`  Max ${MAX_TOTAL_CHUNKS} total chunks (free-tier safe)`)
  console.log('═══════════════════════════════════════════════════')

  // Initialize Firebase Admin (needed for Firestore)
  if (getApps().length === 0) {
    initializeApp()
  }

  let totalChunks = 0

  // ── Helper to enforce the global chunk cap ──────────────────────────
  function capChunks(chunks: string[]): string[] {
    const remaining = MAX_TOTAL_CHUNKS - totalChunks
    if (remaining <= 0) {
      console.log('   🛑 Global chunk cap reached — skipping.')
      return []
    }
    if (chunks.length > remaining) {
      console.log(`   ✂️  Capping from ${chunks.length} to ${remaining} chunks.`)
      return chunks.slice(0, remaining)
    }
    return chunks
  }

  // ══════════════════════════════════════════════════════════════════════
  //  PART 1: PHILIPPINE SPACE DATA
  // ══════════════════════════════════════════════════════════════════════

  console.log('\n\n╔══════════════════════════════════════════════════╗')
  console.log('║  PART 1: Philippine Space Program               ║')
  console.log('╚══════════════════════════════════════════════════╝')

  const phTopics = [
    'Philippine Space Agency',
    'Diwata-1',
    'Diwata-2',
    'Maya-1 (satellite)',
    'PAGASA',
  ]

  for (const topic of phTopics) {
    if (totalChunks >= MAX_TOTAL_CHUNKS) break

    const { chunks, sourceUri } = await fetchWikipediaSummary(topic)
    const capped = capChunks(chunks)
    const docId = `ph_${topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`

    const saved = await embedAndSaveWithRateLimit(docId, topic, sourceUri, capped)
    totalChunks += saved

    // Rate limit between topics
    if (totalChunks < MAX_TOTAL_CHUNKS) {
      await delay(RATE_LIMIT_DELAY_MS)
    }
  }

  // ── Local context: Philippine National Space Policy ─────────────────
  if (totalChunks < MAX_TOTAL_CHUNKS) {
    console.log('\n   📜 Adding local context: Philippine National Space Policy...')
    const policyChunk = [
      `Philippine National Space Policy\n\n` +
        `The Philippine Space Act (Republic Act No. 11363), signed into law on August 8, 2019, ` +
        `established the Philippine Space Agency (PhilSA) as the central government agency for ` +
        `the country's space science and technology programs. The policy aims to develop Philippine ` +
        `capability in space science, promote the development of space applications for national ` +
        `interest, and establish a national space program that addresses disaster risk reduction, ` +
        `climate change mitigation, food security, and national security. The Act mandates PhilSA ` +
        `to oversee the Diwata microsatellite program, the Maya CubeSat series, and emerging ` +
        `partnerships with international space agencies including JAXA and ESA.`,
    ]
    const capped = capChunks(policyChunk)
    const saved = await embedAndSaveWithRateLimit(
      'ph_national_space_policy',
      'Philippine National Space Policy',
      'https://en.wikipedia.org/wiki/Philippine_Space_Act',
      capped
    )
    totalChunks += saved
    await delay(RATE_LIMIT_DELAY_MS)
  }

  // ══════════════════════════════════════════════════════════════════════
  //  PART 2: ADVANCED ASTROPHYSICS
  // ══════════════════════════════════════════════════════════════════════

  console.log('\n\n╔══════════════════════════════════════════════════╗')
  console.log('║  PART 2: Advanced Astrophysics (NASA NTRS)       ║')
  console.log('╚══════════════════════════════════════════════════╝')

  const astrophysicsTopics = [
    { query: 'stellar evolution overview', label: 'Stellar Evolution' },
    { query: 'dark matter evidence', label: 'Dark Matter Evidence' },
  ]

  for (const topic of astrophysicsTopics) {
    if (totalChunks >= MAX_TOTAL_CHUNKS) break

    const { chunks, sourceUri } = await fetchNTRSTopic(topic.query, topic.label)
    const capped = capChunks(chunks)
    const docId = `astro_${topic.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`

    const saved = await embedAndSaveWithRateLimit(docId, topic.label, sourceUri, capped)
    totalChunks += saved

    // Rate limit between topics
    if (totalChunks < MAX_TOTAL_CHUNKS) {
      await delay(RATE_LIMIT_DELAY_MS)
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════')
  console.log(`  ✅ Seed complete! Total chunks ingested: ${totalChunks}/${MAX_TOTAL_CHUNKS}`)
  console.log('═══════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('❌ Seed script failed:', err)
  process.exit(1)
})
