import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { App } from './App'

// Mock useAuth so PrivateRoute resolves (no user → redirects to /auth)
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false, logout: vi.fn(), role: 'user' as const }),
}))

// Mock Firebase modules used by LoginForm/SignupForm
vi.mock('./lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  app: {},
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  setPersistence: vi.fn(),
  browserLocalPersistence: {},
  browserSessionPersistence: {},
  sendPasswordResetEmail: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(),
}))

describe('App', () => {
  it('renders the auth page by default', async () => {
    render(<App />)
    expect(await screen.findByText('ORION')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('Astronomical Intelligence')).toBeInTheDocument()
  })

  it('renders login form by default', async () => {
    render(<App />)
    expect(await screen.findByRole('button', { name: /initialize session/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /establish connection/i })).not.toBeInTheDocument()
  })

  it('toggles to signup form when clicking "Sign Up" in footer', async () => {
    render(<App />)
    const signupButton = await screen.findByRole('button', { name: /sign up/i })
    fireEvent.click(signupButton)

    expect(await screen.findByRole('button', { name: /establish connection/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /initialize session/i })).not.toBeInTheDocument()
  })

  it('toggles back to login form from signup', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /sign up/i }))

    // Now in signup form. Only one "Log In" button (the footer link)
    const loginButton = await screen.findByRole('button', { name: /log in/i })
    fireEvent.click(loginButton)

    expect(await screen.findByRole('button', { name: /initialize session/i })).toBeInTheDocument()
  })
})
