import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from './useAuth'

// Capture the onAuthStateChanged callback
let authStateCallback: ((user: unknown) => void) | null = null
const mockUnsubscribeAuth = vi.fn()

// Capture the onSnapshot callback and error handler
let snapshotCallback: ((snapshot: unknown) => void) | null = null
let snapshotErrorCallback: (() => void) | null = null
const mockUnsubscribeSnapshot = vi.fn()

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: unknown) => void) => {
    authStateCallback = cb
    return mockUnsubscribeAuth
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(
    (_docRef: unknown, cb: (snap: unknown) => void, errCb: () => void) => {
      snapshotCallback = cb
      snapshotErrorCallback = errCb
      return mockUnsubscribeSnapshot
    }
  ),
}))

describe('useAuth', () => {
  afterEach(() => {
    vi.clearAllMocks()
    authStateCallback = null
    snapshotCallback = null
    snapshotErrorCallback = null
  })

  it('should return loading=true initially when no currentUser', () => {
    const { result } = renderHook(() => useAuth())
    // Before onAuthStateChanged fires, loading should be true
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('should set user and loading=false when onAuthStateChanged fires with a user', async () => {
    const { result } = renderHook(() => useAuth())

    const mockUser = { uid: 'user-1', email: 'test@example.com' }
    await act(async () => {
      authStateCallback?.(mockUser)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.loading).toBe(false)
  })

  it('should set user to null and loading=false when onAuthStateChanged fires with null', async () => {
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      authStateCallback?.(null)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('should set role to "user" by default when no user is signed in', async () => {
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      authStateCallback?.(null)
    })

    expect(result.current.role).toBe('user')
  })

  it('should set role from Firestore snapshot data', async () => {
    const { result } = renderHook(() => useAuth())

    // Simulate user login
    await act(async () => {
      authStateCallback?.({ uid: 'user-1' })
    })

    // Simulate Firestore snapshot with admin role
    await act(async () => {
      snapshotCallback?.({ data: () => ({ role: 'admin' }) })
    })

    expect(result.current.role).toBe('admin')
  })

  it('should default role to "user" when snapshot has no role field', async () => {
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      authStateCallback?.({ uid: 'user-1' })
    })

    await act(async () => {
      snapshotCallback?.({ data: () => ({}) })
    })

    expect(result.current.role).toBe('user')
  })

  it('should default role to "user" on Firestore onSnapshot error', async () => {
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      authStateCallback?.({ uid: 'user-1' })
    })

    await act(async () => {
      snapshotErrorCallback?.()
    })

    expect(result.current.role).toBe('user')
  })

  it('should call signOut on logout()', async () => {
    const { signOut } = await import('firebase/auth')
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.logout()
    })

    expect(signOut).toHaveBeenCalled()
  })

  it('should unsubscribe from onAuthStateChanged on unmount', () => {
    const { unmount } = renderHook(() => useAuth())
    unmount()
    expect(mockUnsubscribeAuth).toHaveBeenCalled()
  })

  it('should reset role to "user" when user becomes null', async () => {
    const { result } = renderHook(() => useAuth())

    // Sign in
    await act(async () => {
      authStateCallback?.({ uid: 'user-1' })
    })

    // Set admin role
    await act(async () => {
      snapshotCallback?.({ data: () => ({ role: 'admin' }) })
    })
    expect(result.current.role).toBe('admin')

    // Sign out
    await act(async () => {
      authStateCallback?.(null)
    })

    expect(result.current.role).toBe('user')
  })
})
