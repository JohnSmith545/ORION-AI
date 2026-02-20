import React, { useState } from 'react'
import { CosmicBackground } from '../components/CosmicBackground'
import { AuthLayout } from '../features/auth/components/AuthLayout'
import { LoginForm } from '../features/auth/components/LoginForm'
import { SignupForm } from '../features/auth/components/SignupForm'

/**
 * Auth Page
 *
 * Main entry point for authentication, managing toggle between
 * Login and Signup forms with the cosmic theme.
 */
export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [progress, setProgress] = useState(0)

  const toggleForm = () => {
    setIsLogin(!isLogin)
    setProgress(0) // Reset progress on toggle
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
          <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-white/30 font-light tracking-widest uppercase font-mono">
            {isLogin ? (
              <>
                New to the network?{' '}
                <button
                  className="text-primary/70 hover:text-primary underline decoration-primary/20 underline-offset-8 transition-all hover:drop-shadow-[0_0_8px_rgba(0,242,255,0.4)]"
                  onClick={toggleForm}
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
                  onClick={toggleForm}
                  type="button"
                >
                  Log in
                </button>
              </>
            )}
          </p>
        }
      >
        {isLogin ? (
          <LoginForm onProgressChange={setProgress} />
        ) : (
          <SignupForm onProgressChange={setProgress} onLoginClick={toggleForm} />
        )}
      </AuthLayout>
    </CosmicBackground>
  )
}

export default Auth
