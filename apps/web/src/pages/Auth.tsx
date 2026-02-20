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

  const toggleForm = () => setIsLogin(!isLogin)

  return (
    <CosmicBackground>
      <AuthLayout
        title={
          <>
            ORION<span className="font-bold">AI</span>
          </>
        }
        subtitle="Astronomical Intelligence"
        footer={
          <p className="text-[11px] text-white/30 font-light tracking-wide">
            {isLogin ? (
              <>
                New to the network?{' '}
                <button
                  className="text-white/60 hover:text-white underline decoration-white/20 underline-offset-4 transition-colors"
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
                  className="text-white/60 hover:text-white underline decoration-white/20 underline-offset-4 transition-colors"
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
          <LoginForm onSignupClick={toggleForm} />
        ) : (
          <SignupForm onLoginClick={toggleForm} />
        )}
      </AuthLayout>
    </CosmicBackground>
  )
}

export default Auth
