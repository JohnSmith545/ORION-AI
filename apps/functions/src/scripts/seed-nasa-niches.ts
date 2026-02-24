/**
 * ════════════════════════════════════════════════════════════════════════
 *  seed-nasa-niches.ts — Standalone NASA RAG seed script
 * ════════════════════════════════════════════════════════════════════════
 *
 *  Fetches data from 3 high-interest NASA niches, converts it to natural
 *  language chunks, embeds them via Vertex AI, and saves directly to
 *  Firestore using our existing pipeline functions.
 *
 *  ▸ NO GCS writes — all processing is in-memory.
 *  ▸ Capped at 30 results per topic (90 total) to keep costs near zero.
 *
 *  HOW TO RUN (from apps/functions/):
 *  ──────────────────────────────────
 *  Make sure you're authenticated with GCP (for Vertex AI + Firestore):
 *
 *    gcloud auth application-default login
 *
 *  Then run with tsx (install globally if needed: npm i -g tsx):
 *
 *    npx tsx src/scripts/seed-nasa-niches.ts
 *
 *  Or with the Firebase emulators (Firestore):
 *
 *    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx src/scripts/seed-nasa-niches.ts
 *
 * ════════════════════════════════════════════════════════════════════════
 */

import { initializeApp, getApps } from 'firebase-admin/app'
import { embedTexts } from '../lib/gemini.js'
import { saveToFirestore } from '../lib/ingest.js'

// ── Constants ──────────────────────────────────────────────────────────
const MAX_RESULTS_PER_TOPIC = 30

const NTRS_INGENUITY_URL = 'https://ntrs.nasa.gov/api/citations/search?q=Ingenuity%20helicopter'
const NTRS_APOLLO_URL =
  'https://ntrs.nasa.gov/api/citations/search?q=%22Apollo%2013%22%20%22life%20support%22'
const EXOPLANET_CSV_URL =
  "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,hostname,discoverymethod,disc_year,pl_orbper,pl_rade+from+ps+where+hostname='TRAPPIST-1'&format=csv"

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

// ── Topic Fetchers ─────────────────────────────────────────────────────

/**
 * Fetches from the NASA NTRS API and returns an array of text chunks.
 * Each chunk is a single abstract/description, prepended with its title.
 */
async function fetchNTRSTopic(url: string, topicLabel: string): Promise<string[]> {
  console.log(`\n🔭 Fetching ${topicLabel} from NTRS...`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`NTRS fetch failed for ${topicLabel}: ${res.status} ${res.statusText}`)
  }

  const data = (await res.json()) as NTRSResponse
  const results = (data.results ?? []).slice(0, MAX_RESULTS_PER_TOPIC)

  const chunks: string[] = []
  for (const item of results) {
    const body = item.abstract ?? item.description
    if (!body) continue
    const title = item.title ?? 'Untitled'
    chunks.push(`${title}\n\n${body}`)
  }

  console.log(`   ✅ Got ${chunks.length} chunks for ${topicLabel}`)
  return chunks
}

/**
 * Fetches the TRAPPIST-1 exoplanet CSV from the NASA Exoplanet Archive,
 * parses it in-memory, and converts each row into a natural language sentence.
 */
async function fetchTrappist1(): Promise<string[]> {
  console.log('\n🪐 Fetching TRAPPIST-1 system from Exoplanet Archive...')
  const res = await fetch(EXOPLANET_CSV_URL)
  if (!res.ok) {
    throw new Error(`Exoplanet Archive fetch failed: ${res.status} ${res.statusText}`)
  }

  const csv = await res.text()
  const lines = csv.trim().split('\n')

  // First line is the header row
  const header = lines[0].split(',')
  const dataRows = lines.slice(1, MAX_RESULTS_PER_TOPIC + 1)

  const colIndex = (name: string) => {
    const idx = header.indexOf(name)
    if (idx === -1) throw new Error(`CSV column "${name}" not found. Headers: ${header.join(', ')}`)
    return idx
  }

  const iName = colIndex('pl_name')
  const iMethod = colIndex('discoverymethod')
  const iYear = colIndex('disc_year')
  const iPeriod = colIndex('pl_orbper')
  const iRadius = colIndex('pl_rade')

  const chunks: string[] = []
  for (const row of dataRows) {
    const cols = row.split(',')
    const name = cols[iName]?.trim() || 'Unknown'
    const method = cols[iMethod]?.trim() || 'unknown'
    const year = cols[iYear]?.trim() || 'an unknown year'
    const period = cols[iPeriod]?.trim() || 'unknown'
    const radius = cols[iRadius]?.trim() || 'unknown'

    chunks.push(
      `The exoplanet ${name} orbits the star TRAPPIST-1. ` +
        `It was discovered in ${year} using the ${method} method. ` +
        `It has an orbital period of ${period} days and a radius of ${radius} Earth radii.`
    )
  }

  console.log(`   ✅ Got ${chunks.length} chunks for TRAPPIST-1`)
  return chunks
}

// ── Embed & Save Helper ────────────────────────────────────────────────

/**
 * Embeds an array of text chunks and saves them to Firestore under the
 * given docId, using our existing pipeline functions.
 */
async function embedAndSave(
  docId: string,
  title: string,
  sourceUri: string,
  chunks: string[]
): Promise<void> {
  if (chunks.length === 0) {
    console.log(`   ⚠️  No chunks for "${title}" — skipping.`)
    return
  }

  console.log(`   📐 Embedding ${chunks.length} chunks for "${title}"...`)
  const embeddings = await embedTexts(chunks)

  console.log(`   💾 Saving to Firestore as docId="${docId}"...`)
  await saveToFirestore(docId, title, sourceUri, chunks, embeddings)

  console.log(`   ✅ Done! ${chunks.length} chunks saved for "${title}".`)
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  ORION AI — NASA Niche Seed Script')
  console.log(
    `  Max ${MAX_RESULTS_PER_TOPIC} results per topic (${MAX_RESULTS_PER_TOPIC * 3} total)`
  )
  console.log('═══════════════════════════════════════════════════')

  // Initialize Firebase Admin (needed for Firestore)
  if (getApps().length === 0) {
    initializeApp()
  }

  // ── Topic 1: Mars Ingenuity Helicopter ─────────────────────────────
  const ingenuityChunks = await fetchNTRSTopic(NTRS_INGENUITY_URL, 'Mars Ingenuity Helicopter')
  await embedAndSave(
    'topic_ingenuity',
    'Mars Ingenuity Helicopter',
    'https://ntrs.nasa.gov/search?q=Ingenuity+helicopter',
    ingenuityChunks
  )

  // ── Topic 2: Apollo 13 & Life Support Hacks ────────────────────────
  const apolloChunks = await fetchNTRSTopic(NTRS_APOLLO_URL, 'Apollo 13 Life Support')
  await embedAndSave(
    'topic_apollo13',
    'Apollo 13 & Life Support Systems',
    'https://ntrs.nasa.gov/search?q=Apollo+13+life+support',
    apolloChunks
  )

  // ── Topic 3: TRAPPIST-1 System ─────────────────────────────────────
  const trappistChunks = await fetchTrappist1()
  await embedAndSave(
    'topic_trappist1',
    'TRAPPIST-1 Exoplanet System',
    'https://exoplanetarchive.ipac.caltech.edu/',
    trappistChunks
  )

  console.log('\n═══════════════════════════════════════════════════')
  console.log('  ✅ All 3 topics seeded successfully!')
  console.log('═══════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('❌ Seed script failed:', err)
  process.exit(1)
})
