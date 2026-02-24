import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { embedTexts } from '../lib/gemini.js'

// Initialize Firebase Admin (Uses Application Default Credentials or local emulator)
try {
  initializeApp()
} catch (error) {
  // Ignore if already initialized
}

const db = getFirestore()

const dataPacks = [
  {
    title: 'James Webb Space Telescope - Recent Discoveries',
    text: "The JWST has identified carbon dioxide and methane in the atmosphere of exoplanet K2-18b, a potentially habitable sub-Neptune located 120 light-years away. The telescope's NIRISS instrument detected tentative signs of dimethyl sulfide (DMS), a biomarker exclusively produced by life on Earth. K2-18b orbits a red dwarf star in the habitable zone and is considered a Hycean world, characterized by a hydrogen-rich atmosphere and a water ocean covering its surface.",
    sourceUri: 'orion-internal://jwst-discoveries',
  },
  {
    title: 'Artemis Base Camp and Lunar Gateway Architecture',
    text: 'The Artemis program utilizes the Space Launch System (SLS) and Orion spacecraft. The Lunar Gateway will be placed in a near-rectilinear halo orbit (NRHO) around the Moon, serving as a staging point. The Human Landing System (HLS), currently contracted to SpaceX (Starship HLS) and Blue Origin (Blue Moon), will ferry astronauts from the Gateway to the lunar south pole. The Artemis Base Camp will feature an unpressurized rover, a habitable mobility platform, and a foundational surface habitat for long-duration stays.',
    sourceUri: 'orion-internal://artemis-architecture',
  },
  {
    title: 'Standard Celestial Coordinates and Classifications',
    text: "Sagittarius A* is the supermassive black hole at the galactic center of the Milky Way, located approximately 26,670 light-years from Earth. Coordinates: RA 17h 45m 40s, Dec -29° 00' 28''. The Andromeda Galaxy (M31) is a barred spiral galaxy 2.5 million light-years away, approaching the Milky Way at 110 km/s. Coordinates: RA 00h 42m 44s, Dec +41° 16' 9''.",
    sourceUri: 'orion-internal://astrodynamics-telemetry',
  },
]

// Replace 'documentChunks' with the exact collection name used in your FirestoreVectorStore logic
const COLLECTION_NAME = 'documentChunks'

async function seedPacks() {
  console.log('🚀 Initializing Zero-Cost RAG Ingestion...')

  for (const pack of dataPacks) {
    console.log(`Generating embeddings for: ${pack.title}`)

    // 1. Generate the embedding using Gemini text-embedding-004 (Extremely cheap)
    const [embedding] = await embedTexts([pack.text])

    // 2. Save directly to Firestore using FieldValue.vector (Zero idle cost)
    const docRef = db.collection(COLLECTION_NAME).doc()

    await docRef.set({
      title: pack.title,
      text: pack.text,
      sourceUri: pack.sourceUri,
      // This is the critical piece that makes Firestore Vector Search work:
      embedding: FieldValue.vector(embedding),
      createdAt: FieldValue.serverTimestamp(),
    })

    console.log(`✅ Ingested to Firestore: ${pack.title}`)
  }

  console.log('✨ All data packs ingested successfully!')
  process.exit(0)
}

seedPacks().catch(err => {
  console.error('❌ Seeding failed:', err)
  process.exit(1)
})
