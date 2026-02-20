import React, { useState } from 'react'
import { auth, db } from '../../../lib/firebase'
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useEffect } from 'react'

interface SignupFormProps {
  onProgressChange?: (progress: number) => void
  onLoginClick?: () => void
}

export const SignupForm: React.FC<SignupFormProps> = ({ onProgressChange, onLoginClick }) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      await updateProfile(user, { displayName: name })

      // Sync to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: name,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        provider: 'email',
      })

      console.log('Success: User created and profile updated in Auth and Firestore')
    } catch (err: unknown) {
      const error = err as Error
      console.error('Signup error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Track progress
  useEffect(() => {
    if (!onProgressChange) return
    const filledFields = [name, email, password].filter(field => field.length > 0).length
    onProgressChange(filledFields / 3)
  }, [name, email, password, onProgressChange])

  const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider()
    setLoading(true)
    setError(null)
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Sync/Update in Firestore
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          lastSeen: serverTimestamp(),
          provider: 'google',
        },
        { merge: true }
      )
    } catch (err: unknown) {
      const error = err as Error
      console.error('Google signup error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-login rounded-2xl p-[clamp(1.25rem,5vw,2rem)] backdrop-blur-xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50"></div>
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-3xl rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent-violet/10 blur-3xl rounded-full pointer-events-none"></div>

      <form
        onSubmit={handleSignup}
        className="flex flex-col gap-[clamp(1rem,3vw,1.25rem)] relative z-10"
      >
        {error && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
            {error}
          </div>
        )}

        <div className="flex justify-start mb-2">
          <button
            onClick={onLoginClick}
            type="button"
            className="group/back flex items-center gap-2 text-white/40 hover:text-white transition-colors text-[clamp(0.7rem,1.8vw,0.8rem)] font-mono uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-base group-hover/back:-translate-x-1 transition-transform">
              arrow_back
            </span>
            Return to Nexus
          </button>
        </div>

        <div className="space-y-1">
          <label
            className="text-[clamp(0.75rem,2vw,0.875rem)] font-mono text-white/50 uppercase tracking-wider ml-1"
            htmlFor="signup-identity"
          >
            Coordinate Identity
          </label>
          <div className="relative group/input">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-lg transition-colors group-focus-within/input:text-primary">
              badge
            </span>
            <input
              className="w-full pl-10 pr-4 py-3.5 text-base text-white placeholder-white/20 rounded-lg input-glass focus:ring-0"
              id="signup-identity"
              placeholder="Full Name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            className="text-[clamp(0.75rem,2vw,0.875rem)] font-mono text-white/50 uppercase tracking-wider ml-1"
            htmlFor="signup-email"
          >
            Data Link
          </label>
          <div className="relative group/input">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-lg transition-colors group-focus-within/input:text-primary">
              alternate_email
            </span>
            <input
              className="w-full pl-10 pr-4 py-3.5 text-base text-white placeholder-white/20 rounded-lg input-glass focus:ring-0"
              id="signup-email"
              placeholder="Email Address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            className="text-[clamp(0.75rem,2vw,0.875rem)] font-mono text-white/50 uppercase tracking-wider ml-1"
            htmlFor="signup-password"
          >
            Security Key
          </label>
          <div className="relative group/input">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-lg transition-colors group-focus-within/input:text-primary">
              lock_reset
            </span>
            <input
              className="w-full pl-10 pr-4 py-3.5 text-base text-white placeholder-white/20 rounded-lg input-glass focus:ring-0"
              id="signup-password"
              placeholder="Establish Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <label className="flex items-start gap-2 cursor-pointer group">
            <input
              className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-primary focus:ring-offset-0 focus:ring-primary/50 transition-all checked:bg-primary"
              type="checkbox"
              required
            />
            <span className="text-[clamp(0.7rem,1.8vw,0.8rem)] text-white/40 group-hover:text-white/60 transition-colors font-light leading-snug">
              I accept the{' '}
              <a
                href="#"
                className="text-primary/70 hover:text-primary underline decoration-white/20 underline-offset-4"
              >
                Neural Network Protocols
              </a>{' '}
              and{' '}
              <a
                href="#"
                className="text-primary/70 hover:text-primary underline decoration-white/20 underline-offset-4"
              >
                Data Transmission Policy
              </a>
              .
            </span>
          </label>
        </div>

        <button
          className="mt-4 w-full py-4 px-4 rounded-lg btn-primary-glow text-white font-display text-base uppercase tracking-[0.15em] relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={loading}
        >
          <span className="relative z-10 group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] transition-all">
            {loading ? 'Processing...' : 'Establish Connection'}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
        </button>

        <button
          className="w-full py-3.5 px-4 rounded-lg btn-google-glass text-white/90 font-body text-base relative overflow-hidden group flex items-center justify-center gap-3 disabled:opacity-50"
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            ></path>
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            ></path>
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            ></path>
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            ></path>
          </svg>
          <span className="relative z-10 font-normal tracking-wide">
            {loading ? 'Communicating...' : 'Sign up with Google'}
          </span>
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
        <p className="text-[clamp(0.7rem,1.8vw,0.8rem)] text-white/30 font-light uppercase tracking-widest">
          Or register via quantum link
        </p>
        <div className="flex gap-4">
          <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] transition-all">
            <span className="material-symbols-outlined text-lg text-white/60">hub</span>
          </button>
          <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] transition-all">
            <span className="material-symbols-outlined text-lg text-white/60">fingerprint</span>
          </button>
        </div>
      </div>
    </div>
  )
}
