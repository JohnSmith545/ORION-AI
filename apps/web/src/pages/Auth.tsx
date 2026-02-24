import React, { useState } from 'react'
import { CosmicBackground } from '../components/CosmicBackground'
import { AuthLayout } from '../features/auth/components/AuthLayout'
import { LoginForm } from '../features/auth/components/LoginForm'
import { SignupForm } from '../features/auth/components/SignupForm'
import { RecoverAccessForm } from '../features/auth/components/RecoverAccessForm'

type AuthView = 'login' | 'signup' | 'recover'

/**
 * Auth Page
 *
 * Main entry point for authentication, managing toggle between
 * Login, Signup, and Recover Access forms with the cosmic theme.
 */
export const Auth: React.FC = () => {
  const [view, setView] = useState<AuthView>('login')
  const [progress, setProgress] = useState(0)

  const switchView = (next: AuthView) => {
    setView(next)
    setProgress(0)
  }

  return (
    <CosmicBackground progress={progress}>
      <AuthLayout
        title={
          <>
            ORION<span className="font-bold">AI</span>
          </>
        }
        subtitle="Astronomical Intelligence"
        progress={progress}
        footer={
          <p className="text-xs md:text-sm text-white/30 font-light tracking-widest uppercase font-mono">
            {view === 'login' ? (
              <>
                New to the network?{' '}
                <button
                  className="text-primary/70 hover:text-primary underline decoration-primary/20 underline-offset-8 transition-all hover:drop-shadow-[0_0_8px_rgba(0,242,255,0.4)]"
                  onClick={() => switchView('signup')}
                  type="button"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Existing operative?{' '}
                <button
                  className="text-primary/70 hover:text-primary underline decoration-primary/20 underline-offset-8 transition-all hover:drop-shadow-[0_0_8px_rgba(0,242,255,0.4)]"
                  onClick={() => switchView('login')}
                  type="button"
                >
                  Log in
                </button>
              </>
            )}
          </p>
        }
      >
        {view === 'login' && (
          <LoginForm onProgressChange={setProgress} onRecoverClick={() => switchView('recover')} />
        )}
        {view === 'signup' && (
          <SignupForm onProgressChange={setProgress} onLoginClick={() => switchView('login')} />
        )}
        {view === 'recover' && <RecoverAccessForm onLoginClick={() => switchView('login')} />}
      </AuthLayout>
    </CosmicBackground>
  )
}

export default Auth
