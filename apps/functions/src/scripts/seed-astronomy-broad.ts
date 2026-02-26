/**
 * ════════════════════════════════════════════════════════════════════════
 *  seed-astronomy-broad.ts — Broad Astronomy RAG seed script
 * ════════════════════════════════════════════════════════════════════════
 *
 *  Auto-discovers astronomy articles from Wikipedia categories, fetches
 *  NASA APOD entries, and pulls Solar System body data — then embeds and
 *  saves everything to Firestore for RAG citation support.
 *
 *  DATA SOURCES (all free, no auth required):
 *  ▸ Wikipedia Category Members API + Article Extracts
 *  ▸ NASA Astronomy Picture of the Day (APOD) API
 *  ▸ Solar System OpenData REST API
 *
 *  SAFETY:
 *  ▸ Hard cap of 20,000 chunks per execution (adjustable).
 *  ▸ 2-second delay between embedding batches (100 texts each).
 *  ▸ 100ms delay between Wikipedia article fetches.
 *  ▸ Topics processed sequentially to keep memory low.
 *  ▸ Deduplication enabled to avoid conflicts with existing seeds.
 *
 *  HOW TO RUN (from apps/functions/):
 *  ──────────────────────────────────
 *  Make sure you're authenticated with GCP:
 *
 *    gcloud auth application-default login
 *
 *  Then run with tsx:
 *
 *    npx tsx src/scripts/seed-astronomy-broad.ts
 *
 *  Or with the Firebase emulators (Firestore):
 *
 *    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx src/scripts/seed-astronomy-broad.ts
 *
 * ════════════════════════════════════════════════════════════════════════
 */

import { initializeApp, getApps } from 'firebase-admin/app'
import { embedTexts } from '../lib/gemini.js'
import { saveToFirestore, chunkText } from '../lib/ingest.js'

// ── Constants ──────────────────────────────────────────────────────────
const MAX_TOTAL_CHUNKS = 20_000
const EMBED_BATCH_SIZE = 100
const RATE_LIMIT_DELAY_MS = 2000
const WIKI_DELAY_MS = 100
const MAX_ARTICLES_PER_CATEGORY = 50

const WIKI_USER_AGENT = 'OrionAI-SeedBot/1.0 (astronomy-rag-seed-script)'

/** Wikipedia categories to crawl (depth 1 only — no recursion). */
const WIKIPEDIA_CATEGORIES = [
  'Planets_of_the_Solar_System',
  'Dwarf_planets',
  'Moons_of_Jupiter',
  'Moons_of_Saturn',
  'Moons_of_Mars',
  'Moons_of_Neptune',
  'Moons_of_Uranus',
  'Stars',
  'Star_types',
  'Galaxies',
  'Nebulae',
  'Constellations',
  'Black_holes',
  'Supernovae',
  'Comets',
  'Asteroids',
  'Exoplanets',
  'NASA_programs',
  'Human_spaceflight',
  'Space_telescopes',
  'Cosmology',
  'Astrophysics',
]

// ── Types ──────────────────────────────────────────────────────────────

interface WikiCategoryMember {
  pageid: number
  ns: number
  title: string
}

interface APODEntry {
  date: string
  title: string
  explanation: string
  url?: string
  hdurl?: string
}

interface SolarBody {
  id: string
  name: string
  englishName: string
  bodyType: string
  isPlanet: boolean
  gravity: number
  meanRadius: number
  sideralOrbit: number
  sideralRotation: number
  discoveredBy: string
  discoveryDate: string
  aroundPlanet: { planet: string } | null
  mass: { massValue: number; massExponent: number } | null
  avgTemp: number
}

// ── Helpers ─────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Returns a capped slice of chunks respecting the global limit.
 */
function capChunks(chunks: string[], totalSoFar: number): string[] {
  const remaining = MAX_TOTAL_CHUNKS - totalSoFar
  if (remaining <= 0) return []
  if (chunks.length > remaining) {
    console.log(`   ✂️  Capping from ${chunks.length} to ${remaining} chunks.`)
    return chunks.slice(0, remaining)
  }
  return chunks
}

// ── Wikipedia Functions ─────────────────────────────────────────────────

/**
 * Fetches all page titles from a Wikipedia category (with pagination).
 * Returns at most MAX_ARTICLES_PER_CATEGORY titles.
 */
async function fetchCategoryMembers(category: string): Promise<string[]> {
  const titles: string[] = []
  let cmcontinue: string | undefined

  do {
    const url = new URL('https://en.wikipedia.org/w/api.php')
    url.searchParams.set('action', 'query')
    url.searchParams.set('list', 'categorymembers')
    url.searchParams.set('cmtitle', `Category:${category}`)
    url.searchParams.set('cmtype', 'page')
    url.searchParams.set('cmlimit', String(MAX_ARTICLES_PER_CATEGORY))
    url.searchParams.set('format', 'json')
    if (cmcontinue) url.searchParams.set('cmcontinue', cmcontinue)

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': WIKI_USER_AGENT },
    })

    if (!res.ok) {
      console.warn(`   ⚠️  Category fetch failed for ${category}: ${res.status}`)
      break
    }

    const data = (await res.json()) as {
      query?: { categorymembers?: WikiCategoryMember[] }
      continue?: { cmcontinue?: string }
    }

    const members = data.query?.categorymembers ?? []
    for (const m of members) {
      if (titles.length >= MAX_ARTICLES_PER_CATEGORY) break
      titles.push(m.title)
    }

    cmcontinue = titles.length < MAX_ARTICLES_PER_CATEGORY ? data.continue?.cmcontinue : undefined
  } while (cmcontinue)

  return titles
}

/**
 * Fetches the full plain-text extract of a Wikipedia article.
 * Returns null if the article has no meaningful content.
 */
async function fetchArticleExtract(
  title: string
): Promise<{ text: string; sourceUri: string } | null> {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('prop', 'extracts')
  url.searchParams.set('explaintext', 'true')
  url.searchParams.set('titles', title)
  url.searchParams.set('format', 'json')

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': WIKI_USER_AGENT },
  })

  if (!res.ok) return null

  const data = (await res.json()) as {
    query?: { pages?: Record<string, { title?: string; extract?: string }> }
  }

  const pages = data.query?.pages
  if (!pages) return null

  const pageId = Object.keys(pages)[0]
  if (!pageId || pageId === '-1') return null

  const extract = pages[pageId].extract
  if (!extract || extract.length < 100) return null

  const encoded = encodeURIComponent(title.replace(/ /g, '_'))
  return {
    text: `${title}\n\n${extract}`,
    sourceUri: `https://en.wikipedia.org/wiki/${encoded}`,
  }
}

// ── NASA APOD Function ──────────────────────────────────────────────────

/**
 * Fetches NASA APOD entries for a date range.
 * The API returns a JSON array when start_date/end_date are provided.
 */
async function fetchAPODRange(startDate: string, endDate: string): Promise<APODEntry[]> {
  console.log(`\n🌌 Fetching NASA APOD from ${startDate} to ${endDate}...`)

  const url = `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&start_date=${startDate}&end_date=${endDate}`
  const res = await fetch(url)

  if (!res.ok) {
    console.warn(`   ⚠️  APOD fetch failed: ${res.status} ${res.statusText}`)
    return []
  }

  const data = (await res.json()) as APODEntry[]
  console.log(`   ✅ Got ${data.length} APOD entries`)
  return data.filter(e => e.explanation && e.explanation.length > 50)
}

// ── Solar System OpenData Function ──────────────────────────────────────

/**
 * Fetches all solar system bodies and converts each to a natural language chunk.
 */
async function fetchSolarBodies(): Promise<{ text: string; sourceUri: string; name: string }[]> {
  console.log('\n🪐 Fetching Solar System bodies from OpenData API...')

  const res = await fetch('https://api.le-systeme-solaire.net/rest/bodies/')
  if (!res.ok) {
    console.warn(`   ⚠️  Solar System API failed: ${res.status}`)
    return []
  }

  const data = (await res.json()) as { bodies: SolarBody[] }
  const results: { text: string; sourceUri: string; name: string }[] = []

  for (const body of data.bodies) {
    if (!body.englishName) continue

    const parts: string[] = []

    // Opening sentence
    if (body.isPlanet) {
      parts.push(`${body.englishName} is a planet in our Solar System.`)
    } else if (body.aroundPlanet) {
      parts.push(`${body.englishName} is a moon of ${body.aroundPlanet.planet}.`)
    } else if (body.bodyType) {
      parts.push(`${body.englishName} is a ${body.bodyType} in our Solar System.`)
    } else {
      parts.push(`${body.englishName} is a body in our Solar System.`)
    }

    // Physical properties
    if (body.meanRadius > 0) {
      parts.push(`It has a mean radius of ${body.meanRadius} km.`)
    }
    if (body.mass) {
      parts.push(`Its mass is ${body.mass.massValue} × 10^${body.mass.massExponent} kg.`)
    }
    if (body.gravity > 0) {
      parts.push(`Surface gravity is ${body.gravity} m/s².`)
    }
    if (body.avgTemp > 0) {
      parts.push(`Average temperature is ${body.avgTemp} K.`)
    }

    // Orbital properties
    if (body.sideralOrbit > 0) {
      parts.push(`Its orbital period is ${body.sideralOrbit} days.`)
    }
    if (body.sideralRotation !== 0) {
      parts.push(`Its rotation period is ${body.sideralRotation} hours.`)
    }

    // Discovery
    if (body.discoveredBy) {
      const when = body.discoveryDate ? ` in ${body.discoveryDate}` : ''
      parts.push(`It was discovered by ${body.discoveredBy}${when}.`)
    }

    results.push({
      text: parts.join(' '),
      sourceUri: `https://api.le-systeme-solaire.net/rest/bodies/${body.id}`,
      name: body.englishName,
    })
  }

  console.log(`   ✅ Generated ${results.length} body descriptions`)
  return results
}

// ── Rate-Limited Embed & Save ───────────────────────────────────────────

/**
 * Embeds an array of text chunks with rate limiting and saves to Firestore.
 * Deduplication is enabled to avoid conflicts with previously seeded data.
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

  console.log(`   💾 Saving to Firestore as docId="${docId}" (dedup enabled)...`)
  await saveToFirestore(docId, title, sourceUri, chunks, allEmbeddings, true)

  console.log(`   ✅ Done! ${chunks.length} chunks saved for "${title}".`)
  return chunks.length
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const t0 = performance.now()

  console.log('═══════════════════════════════════════════════════')
  console.log('  ORION AI — Broad Astronomy Seed Script')
  console.log(`  Max ${MAX_TOTAL_CHUNKS.toLocaleString()} total chunks`)
  console.log(`  Sources: Wikipedia, NASA APOD, Solar System OpenData`)
  console.log('═══════════════════════════════════════════════════')

  if (getApps().length === 0) {
    initializeApp()
  }

  let totalChunks = 0
  let totalChars = 0
  const sourceCounts = { wikipedia: 0, apod: 0, solar: 0 }

  // ══════════════════════════════════════════════════════════════════════
  //  SOURCE 1: WIKIPEDIA CATEGORIES
  // ══════════════════════════════════════════════════════════════════════

  console.log('\n\n╔══════════════════════════════════════════════════╗')
  console.log('║  SOURCE 1: Wikipedia Categories                  ║')
  console.log('╚══════════════════════════════════════════════════╝')

  const seenArticles = new Set<string>()

  for (const category of WIKIPEDIA_CATEGORIES) {
    if (totalChunks >= MAX_TOTAL_CHUNKS) {
      console.log('\n   🛑 Global chunk cap reached — stopping Wikipedia ingestion.')
      break
    }

    console.log(`\n📂 Category: ${category}`)

    let titles: string[]
    try {
      titles = await fetchCategoryMembers(category)
    } catch (err) {
      console.warn(`   ⚠️  Failed to fetch category "${category}": ${err}`)
      continue
    }

    console.log(`   📄 Found ${titles.length} articles`)

    let categoryChunks = 0
    for (const title of titles) {
      if (totalChunks >= MAX_TOTAL_CHUNKS) break
      if (seenArticles.has(title)) {
        console.log(`   ⏭️  Skipping duplicate: "${title}"`)
        continue
      }
      seenArticles.add(title)

      try {
        await delay(WIKI_DELAY_MS)
        const article = await fetchArticleExtract(title)
        if (!article) {
          console.log(`   ⏭️  No content for: "${title}"`)
          continue
        }

        const chunks = chunkText(article.text, 1000, 200)
        const capped = capChunks(chunks, totalChunks)
        if (capped.length === 0) break

        const docId = `wiki_${title
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .slice(0, 60)}`
        const saved = await embedAndSaveWithRateLimit(docId, title, article.sourceUri, capped)

        totalChunks += saved
        sourceCounts.wikipedia += saved
        totalChars += capped.reduce((sum, c) => sum + c.length, 0)
        categoryChunks += saved
      } catch (err) {
        console.warn(`   ⚠️  Failed to process "${title}": ${err}`)
        continue
      }
    }

    console.log(
      `   📊 Category "${category}": ${categoryChunks} chunks (running total: ${totalChunks})`
    )
    await delay(RATE_LIMIT_DELAY_MS)
  }

  // ══════════════════════════════════════════════════════════════════════
  //  SOURCE 2: NASA APOD
  // ══════════════════════════════════════════════════════════════════════

  if (totalChunks < MAX_TOTAL_CHUNKS) {
    console.log('\n\n╔══════════════════════════════════════════════════╗')
    console.log('║  SOURCE 2: NASA Astronomy Picture of the Day     ║')
    console.log('╚══════════════════════════════════════════════════╝')

    // Fetch in yearly batches to avoid DEMO_KEY rate limits
    const yearRanges = [
      ['2023-01-01', '2023-12-31'],
      ['2024-01-01', '2024-12-31'],
      ['2025-01-01', '2025-12-31'],
    ]

    for (const [start, end] of yearRanges) {
      if (totalChunks >= MAX_TOTAL_CHUNKS) break

      try {
        const entries = await fetchAPODRange(start, end)

        for (const entry of entries) {
          if (totalChunks >= MAX_TOTAL_CHUNKS) break

          const text = `${entry.title}\n\n${entry.explanation}`
          const chunks = chunkText(text, 1000, 200)
          const capped = capChunks(chunks, totalChunks)
          if (capped.length === 0) break

          const dateSlug = entry.date.replace(/-/g, '')
          const docId = `apod_${dateSlug}`
          const sourceUri = `https://apod.nasa.gov/apod/ap${dateSlug.slice(2)}.html`

          const saved = await embedAndSaveWithRateLimit(
            docId,
            `APOD: ${entry.title}`,
            sourceUri,
            capped
          )

          totalChunks += saved
          sourceCounts.apod += saved
          totalChars += capped.reduce((sum, c) => sum + c.length, 0)
        }
      } catch (err) {
        console.warn(`   ⚠️  APOD range ${start}–${end} failed: ${err}`)
      }

      // Respect DEMO_KEY rate limits between year batches
      await delay(5000)
    }

    console.log(`   📊 APOD total: ${sourceCounts.apod} chunks`)
  }

  // ══════════════════════════════════════════════════════════════════════
  //  SOURCE 3: SOLAR SYSTEM OPENDATA
  // ══════════════════════════════════════════════════════════════════════

  if (totalChunks < MAX_TOTAL_CHUNKS) {
    console.log('\n\n╔══════════════════════════════════════════════════╗')
    console.log('║  SOURCE 3: Solar System OpenData                 ║')
    console.log('╚══════════════════════════════════════════════════╝')

    try {
      const bodies = await fetchSolarBodies()

      // Batch all body descriptions into a single docId for efficiency
      const bodyChunks = bodies.map(b => b.text)
      const capped = capChunks(bodyChunks, totalChunks)

      if (capped.length > 0) {
        const saved = await embedAndSaveWithRateLimit(
          'solar_system_bodies',
          'Solar System Bodies',
          'https://api.le-systeme-solaire.net/rest/bodies/',
          capped
        )

        totalChunks += saved
        sourceCounts.solar += saved
        totalChars += capped.reduce((sum, c) => sum + c.length, 0)
      }
    } catch (err) {
      console.warn(`   ⚠️  Solar System fetch failed: ${err}`)
    }

    console.log(`   📊 Solar System total: ${sourceCounts.solar} chunks`)
  }

  // ══════════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ══════════════════════════════════════════════════════════════════════

  const elapsed = Math.round((performance.now() - t0) / 1000)
  const estimatedCost = (totalChars / 1000) * 0.000025

  console.log('\n═══════════════════════════════════════════════════')
  console.log('  ✅ Broad Astronomy Seed Complete!')
  console.log('═══════════════════════════════════════════════════')
  console.log(`  Wikipedia chunks:     ${sourceCounts.wikipedia.toLocaleString()}`)
  console.log(`  NASA APOD chunks:     ${sourceCounts.apod.toLocaleString()}`)
  console.log(`  Solar System chunks:  ${sourceCounts.solar.toLocaleString()}`)
  console.log(`  ─────────────────────────────────────`)
  console.log(`  Total chunks:         ${totalChunks.toLocaleString()}`)
  console.log(`  Total characters:     ${totalChars.toLocaleString()}`)
  console.log(`  Estimated cost:       $${estimatedCost.toFixed(4)}`)
  console.log(`  Time elapsed:         ${elapsed}s`)
  console.log('═══════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('❌ Seed script failed:', err)
  process.exit(1)
})
