import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Connect to Firebase Emulators in local/E2E dev mode
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  // Guard against double-connect during HMR
  if (!(window as unknown as Record<string, boolean>).__FIREBASE_EMULATORS_CONNECTED__) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, 'localhost', 8080)
    ;(window as unknown as Record<string, boolean>).__FIREBASE_EMULATORS_CONNECTED__ = true
  }
}

// Initialize Analytics lazily (avoids top-level await which breaks Vite HMR)
let _analytics: Analytics | null = null
export async function getAppAnalytics(): Promise<Analytics | null> {
  if (_analytics) return _analytics
  const supported = await isSupported()
  if (supported) _analytics = getAnalytics(app)
  return _analytics
}