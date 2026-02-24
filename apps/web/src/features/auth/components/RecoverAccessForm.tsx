import React, { useState } from 'react'
import { auth } from '../../../lib/firebase'
import { sendPasswordResetEmail } from 'firebase/auth'

interface RecoverAccessFormProps {
  onLoginClick?: () => void
}

export const RecoverAccessForm: React.FC<RecoverAccessFormProps> = ({ onLoginClick }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await sendPasswordResetEmail(auth, email)
      setSent(true)
    } catch (err: unknown) {
      const error = err as Error
      console.error('Recovery error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-login rounded-2xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50"></div>
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-3xl rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent-violet/10 blur-3xl rounded-full pointer-events-none"></div>

      <div className="flex flex-col gap-4 md:gap-5 relative z-10">
        <button
          onClick={onLoginClick}
          type="button"
          className="group/back flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs md:text-sm font-mono uppercase tracking-widest"
        >
          <span className="material-symbols-outlined text-base group-hover/back:-translate-x-1 transition-transform">
            arrow_back
          </span>
          Return to Nexus
        </button>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <span className="material-symbols-outlined text-5xl text-primary drop-shadow-[0_0_15px_rgba(0,242,255,0.6)]">
              mark_email_read
            </span>
            <h2 className="text-lg font-display uppercase tracking-[0.15em] text-white">
              Transmission Sent
            </h2>
            <p className="text-sm text-white/50 font-light text-center leading-relaxed">
              A recovery link has been transmitted to{' '}
              <span className="text-primary/80 font-mono">{email}</span>. Check your inbox and
              follow the instructions to reset your security key.
            </p>
            <button
              onClick={onLoginClick}
              type="button"
              className="mt-2 w-full py-3.5 px-4 rounded-lg btn-primary-glow text-white font-display text-base uppercase tracking-[0.15em] relative overflow-hidden group"
            >
              <span className="relative z-10 group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] transition-all">
                Return to Login
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
            </button>
          </div>
        ) : (
          <form onSubmit={handleRecover} className="flex flex-col gap-4 md:gap-5">
            <div className="flex flex-col items-center gap-2 py-2">
              <span className="material-symbols-outlined text-4xl text-primary/70">lock_reset</span>
              <p className="text-xs md:text-sm text-white/40 font-light text-center leading-relaxed">
                Enter the email linked to your account and we&apos;ll send you a secure recovery
                link.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label
                className="text-xs md:text-sm font-mono text-white/50 uppercase tracking-wider ml-1"
                htmlFor="recover-email"
              >
                Data Link
              </label>
              <div className="relative group/input">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-lg transition-colors group-focus-within/input:text-primary">
                  alternate_email
                </span>
                <input
                  className="w-full pl-10 pr-4 py-3.5 text-base text-white placeholder-white/20 rounded-lg input-glass focus:ring-0"
                  id="recover-email"
                  placeholder="Email Address"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              className="mt-2 w-full py-3.5 px-4 rounded-lg btn-primary-glow text-white font-display text-base uppercase tracking-[0.15em] relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              <span className="relative z-10 group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] transition-all">
                {loading ? 'Transmitting...' : 'Send Recovery Link'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
