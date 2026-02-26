/**
 * ════════════════════════════════════════════════════════════════════════
 *  seed-space-missions.ts — Comprehensive Space Missions Seed Script
 * ════════════════════════════════════════════════════════════════════════
 *
 *  Ingests high-quality, reliable data about historic and modern space missions
 *  from diverse, non-Wikipedia-only sources:
 *  ▸ SpaceX API (Rockets, Launches, Missions)
 *  ▸ The Space Devs (Launch Library 2) - Missions API
 *  ▸ NASA TechPort API (Technology Development)
 *  ▸ Wikipedia (Category Members & Extracts)
 *
 *  SAFETY & BUDGET:
 *  ▸ Hard cap of 20,000 chunks (approx. $0.50 cost using text-embedding-004).
 *  ▸ Sequential processing with rate limiting to stay within free-tier quotas.
 *  ▸ Deduplication enabled (cosine similarity > 0.95 skip).
 *
 * ════════════════════════════════════════════════════════════════════════
 */

import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { embedTexts } from '../lib/gemini.js'
import { saveToFirestore, chunkText } from '../lib/ingest.js'

// ── Constants ──────────────────────────────────────────────────────────
const MAX_TOTAL_CHUNKS = 20_000
const EMBED_BATCH_SIZE = 100
const RATE_LIMIT_DELAY_MS = 2000
const API_DELAY_MS = 500
const WIKI_DELAY_MS = 100

const USER_AGENT = 'OrionAI-SeedBot/1.0 (space-missions-rag-seed-script)'

// ── Types ──────────────────────────────────────────────────────────────

interface SpaceXLaunch {
  name: string
  date_utc: string
  details: string | null
  links: {
    wikipedia: string | null
    article: string | null
  }
  rocket: string
  success: boolean | null
}

interface TSDLaunch {
  id: string
  name: string
  mission: {
    id: number
    name: string
    description: string
    type: {
      name: string
    }
    orbit: {
      name: string
    } | null
  } | null
  url: string
}

interface TechPortProject {
  id: number
  title: string
  description: string
  benefits: string
  status: string
}

// ── Helpers ─────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function capChunks(chunks: string[], totalSoFar: number): string[] {
  const remaining = MAX_TOTAL_CHUNKS - totalSoFar
  if (remaining <= 0) return []
  if (chunks.length > remaining) {
    console.log(`   ✂️  Capping from ${chunks.length} to ${remaining} chunks.`)
    return chunks.slice(0, remaining)
  }
  return chunks
}

async function embedAndSaveWithRateLimit(
  docId: string,
  title: string,
  sourceUri: string,
  chunks: string[]
): Promise<number> {
  if (chunks.length === 0) return 0

  // ── Smart Skip ────────────────────────────────────────────────────────
  // Check if this document ID already exists in Firestore BEFORE calling
  // the expensive embedding API. This is faster and works even if the
  // vector index is still building.
  const db = getFirestore()
  const docSnap = await db.collection('documentChunks').doc(docId).get()

  if (docSnap.exists) {
    console.log(`   ⏭️  Smart Skip: "${title}" already exists (docId: ${docId}).`)
    return 0
  }

  console.log(`   📐 Embedding ${chunks.length} chunks for "${title}"...`)
  const allEmbeddings: number[][] = []

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE)
    const embeddings = await embedTexts(batch)
    allEmbeddings.push(...embeddings)

    if (i + EMBED_BATCH_SIZE < chunks.length) {
      await delay(RATE_LIMIT_DELAY_MS)
    }
  }

  await saveToFirestore(docId, title, sourceUri, chunks, allEmbeddings, true)
  return chunks.length
}

// ── Source 1: SpaceX API ────────────────────────────────────────────────

async function ingestSpaceXLaunches(): Promise<number> {
  console.log('\n🚀 Fetching SpaceX Launch data...')
  try {
    const res = await fetch('https://api.spacexdata.com/v4/launches')
    if (!res.ok) {
      console.warn(`   ⚠️  SpaceX API failed: ${res.status}`)
      return 0
    }
    const launches = (await res.json()) as SpaceXLaunch[]

    // Filter for launches with meaningful details
    const meaningfulLaunches = launches.filter(l => l.details && l.details.length > 100).slice(-30) // Recent 30

    let count = 0
    for (const launch of meaningfulLaunches) {
      try {
        const text = `SpaceX Launch: ${launch.name}\nDate: ${launch.date_utc}\nSuccess: ${launch.success ? 'Yes' : 'No'}\n\nDetails: ${launch.details}`
        const chunks = chunkText(text, 1000, 200)
        const docId = `spacex_${launch.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        const sourceUri =
          launch.links.wikipedia || launch.links.article || 'https://www.spacex.com/launches'

        count += await embedAndSaveWithRateLimit(docId, `SpaceX: ${launch.name}`, sourceUri, chunks)
        await delay(API_DELAY_MS)
      } catch (err) {
        console.warn(`   ⚠️  Failed to process SpaceX launch "${launch.name}": ${err}`)
      }
    }
    return count
  } catch (err) {
    console.error(`   ❌ Fatal error in SpaceX ingestion: ${err}`)
    return 0
  }
}

// ── Source 2: The Space Devs (TSD) ──────────────────────────────────────

async function ingestTSDMissions(): Promise<number> {
  console.log('\n🛰️  Fetching Recent Launches & Missions (TSD/Launch Library 2)...')
  try {
    // Version 2.2.0 /mission/ is deprecated/404. Moving to 2.3.0 /launches/ where mission data is embedded.
    const res = await fetch('https://lldev.thespacedevs.com/2.3.0/launches/?limit=20')
    if (!res.ok) {
      console.warn(`   ⚠️  TSD API failed: ${res.status}`)
      return 0
    }
    const data = (await res.json()) as { results: TSDLaunch[] }

    let count = 0
    for (const launch of data.results) {
      if (!launch.mission) continue // Skip launches without mission descriptions

      const m = launch.mission
      try {
        const orbitText = m.orbit ? ` Orbit: ${m.orbit.name}.` : ''
        const typeText =
          typeof m.type === 'string' ? m.type : (m.type as Record<string, string>).name || 'N/A'

        const text = `Space Mission: ${m.name}\nLaunch: ${launch.name}\nType: ${typeText}.${orbitText}\n\nDescription: ${m.description}`
        const chunks = chunkText(text, 1000, 200)
        const docId = `tsd_mission_${m.id || launch.id}`
        const sourceUri = launch.url || `https://thespacedevs.com/launch/${launch.id}`

        count += await embedAndSaveWithRateLimit(docId, `Mission: ${m.name}`, sourceUri, chunks)
        await delay(API_DELAY_MS)
      } catch (err) {
        console.warn(`   ⚠️  Failed to process TSD mission: ${err}`)
      }
    }
    return count
  } catch (err) {
    console.error(`   ❌ Fatal error in TSD ingestion: ${err}`)
    return 0
  }
}

// ── Source 3: NASA TechPort ─────────────────────────────────────────────

async function ingestNASATechPort(): Promise<number> {
  console.log('\n🛠️  Fetching NASA TechPort technology projects...')
  try {
    // TechPort has a huge list; we'll fetch the recent IDs and then details for a few.
    const listRes = await fetch('https://api.nasa.gov/techport/api/projects?api_key=DEMO_KEY')
    if (!listRes.ok) {
      console.warn(`   ⚠️  TechPort API failed: ${listRes.status}`)
      return 0
    }
    const listData = (await listRes.json()) as { projects: { id: number }[] }

    const sampleIds = listData.projects.slice(0, 10).map(p => p.id)
    let count = 0

    for (const id of sampleIds) {
      try {
        const res = await fetch(`https://api.nasa.gov/techport/api/projects/${id}?api_key=DEMO_KEY`)
        if (!res.ok) continue
        const data = (await res.json()) as { project: TechPortProject }
        const p = data.project

        const text = `NASA Technology Project: ${p.title}\nStatus: ${p.status}\n\nDescription: ${p.description}\n\nBenefits: ${p.benefits}`
        const chunks = chunkText(text, 1000, 200)
        const docId = `nasa_tech_${id}`
        const sourceUri = `https://techport.nasa.gov/view/${id}`

        count += await embedAndSaveWithRateLimit(docId, `NASA Tech: ${p.title}`, sourceUri, chunks)
        await delay(API_DELAY_MS)
      } catch (err) {
        console.warn(`   ⚠️  TechPort project ${id} failed: ${err}`)
      }
    }
    return count
  } catch (err) {
    console.error(`   ❌ Fatal error in NASA TechPort ingestion: ${err}`)
    return 0
  }
}

// ── Source 4: Wikipedia ─────────────────────────────────────────────────

const WIKIPEDIA_CATEGORIES = [
  'Space_missions_to_the_Moon',
  'Mars_missions',
  'Interplanetary_space_missions',
  'Space_telescope_missions',
  'Human_spaceflight_programs',
  'NASA_missions',
  'ESA_missions',
  'JAXA_missions',
  'Deep_space_probes',
]

async function fetchWikiExtract(title: string) {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('prop', 'extracts')
  url.searchParams.set('explaintext', 'true')
  url.searchParams.set('titles', title)
  url.searchParams.set('format', 'json')

  const res = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) return null
  const data = (await res.json()) as Record<
    string,
    Record<string, Record<string, { extract?: string }>>
  >
  const pages = data.query?.pages
  if (!pages) return null
  const pageId = Object.keys(pages)[0]
  if (pageId === '-1') return null
  return pages[pageId].extract
}

async function ingestWikipedia(currentTotal: number): Promise<number> {
  console.log('\n📚 Fetching Wikipedia articles for space missions...')
  let wikiCount = 0

  try {
    for (const category of WIKIPEDIA_CATEGORIES) {
      if (currentTotal + wikiCount >= MAX_TOTAL_CHUNKS) break
      console.log(`\n📂 Category: ${category}`)

      try {
        const catUrl = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:${category}&cmtype=page&cmlimit=10&format=json`
        const catRes = await fetch(catUrl, { headers: { 'User-Agent': USER_AGENT } })
        if (!catRes.ok) {
          console.warn(`   ⚠️  Wikipedia category fetch failed for ${category}: ${catRes.status}`)
          continue
        }
        const catData = (await catRes.json()) as Record<
          string,
          { categorymembers?: Array<{ title: string }> }
        >
        const members = catData.query?.categorymembers ?? []

        for (const member of members) {
          if (currentTotal + wikiCount >= MAX_TOTAL_CHUNKS) break
          try {
            await delay(WIKI_DELAY_MS)

            const extract = await fetchWikiExtract(member.title)
            if (!extract || extract.length < 500) continue

            const chunks = chunkText(`${member.title}\n\n${extract}`, 1000, 200)
            const capped = capChunks(chunks, currentTotal + wikiCount)
            const docId = `wiki_mission_${member.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
            const sourceUri = `https://en.wikipedia.org/wiki/${encodeURIComponent(member.title.replace(/ /g, '_'))}`

            wikiCount += await embedAndSaveWithRateLimit(docId, member.title, sourceUri, capped)
          } catch (err) {
            console.warn(`   ⚠️  Failed to process Wikipedia article "${member.title}": ${err}`)
          }
        }
      } catch (err) {
        console.warn(`   ⚠️  Error in Wikipedia category processing for "${category}": ${err}`)
      }
    }
  } catch (err) {
    console.error(`   ❌ Fatal error in Wikipedia ingestion: ${err}`)
  }
  return wikiCount
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const t0 = performance.now()

  console.log('═══════════════════════════════════════════════════')
  console.log('  ORION AI — Space Missions Seed Script')
  console.log(`  Targeting diverse, reliable sources`)
  console.log('═══════════════════════════════════════════════════')

  if (getApps().length === 0) {
    initializeApp({
      projectId: 'orion-ai-2790b', // Hardcoded from system metadata
    })
  }

  let totalChunks = 0

  // 1. SpaceX
  totalChunks += await ingestSpaceXLaunches()

  // 2. TSD Missions
  if (totalChunks < MAX_TOTAL_CHUNKS) {
    totalChunks += await ingestTSDMissions()
  }

  // 3. NASA TechPort
  if (totalChunks < MAX_TOTAL_CHUNKS) {
    totalChunks += await ingestNASATechPort()
  }

  // 4. Wikipedia
  if (totalChunks < MAX_TOTAL_CHUNKS) {
    totalChunks += await ingestWikipedia(totalChunks)
  }

  const elapsed = Math.round((performance.now() - t0) / 1000)
  const estimatedCost = ((totalChunks * 1000) / 1000) * 0.000025 // Approx 1k chars per chunk

  console.log('\n═══════════════════════════════════════════════════')
  console.log('  ✅ Space Missions Seed Complete!')
  console.log(`  Total chunks saved:    ${totalChunks.toLocaleString()}`)
  console.log(`  Estimated AI cost:     $${estimatedCost.toFixed(4)}`)
  console.log(`  Time elapsed:          ${elapsed}s`)
  console.log('═══════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('❌ Seed script failed:', err)
  process.exit(1)
})
