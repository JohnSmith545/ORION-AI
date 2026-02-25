/**
 * Firebase Auth Emulator helpers for E2E tests.
 *
 * Uses the Auth Emulator REST API to programmatically create users,
 * clear emulator state, etc. without needing the Firebase client SDK.
 */

const AUTH_EMULATOR = 'http://localhost:9099'
const FIRESTORE_EMULATOR = 'http://localhost:8080'
const PROJECT_ID = 'orion-ai-2790b'

interface EmulatorUser {
  localId: string
  email: string
  displayName?: string
}

/**
 * Creates a user in the Firebase Auth Emulator via REST API.
 */
export async function createEmulatorUser(
  email: string,
  password: string,
  displayName?: string
): Promise<EmulatorUser> {
  const response = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        displayName,
        returnSecureToken: true,
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Failed to create emulator user: ${err}`)
  }

  const data = await response.json()
  return {
    localId: data.localId,
    email: data.email,
    displayName: displayName,
  }
}

/**
 * Clears all accounts from the Firebase Auth Emulator.
 */
export async function clearAuthEmulator(): Promise<void> {
  await fetch(
    `${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: 'DELETE' }
  )
}

/**
 * Clears all documents from the Firestore Emulator.
 */
export async function clearFirestoreEmulator(): Promise<void> {
  await fetch(
    `${FIRESTORE_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' }
  )
}

/**
 * Clears both Auth and Firestore emulators.
 */
export async function clearAllEmulators(): Promise<void> {
  await Promise.all([clearAuthEmulator(), clearFirestoreEmulator()])
}
