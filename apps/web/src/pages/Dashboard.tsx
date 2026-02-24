import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DashboardBackground } from '../components/dashboard/DashboardBackground'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DashboardSidebarLeft } from '../components/dashboard/DashboardSidebarLeft'
import {
  DashboardSidebarRight,
  CelestialTarget,
} from '../components/dashboard/DashboardSidebarRight'
import { DashboardChatSection } from '../components/dashboard/DashboardChatSection'
import { DashboardFooter } from '../components/dashboard/DashboardFooter'
import { DashboardWelcomeModal } from '../components/dashboard/DashboardWelcomeModal'

/**
 * ORION AI Intelligence Dashboard
 *
 * Three-column layout: Mission Feed (left), Chat (center), System Status (right).
 * Ensures dark mode is active for the dashboard theme.
 */
export const Dashboard: React.FC = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // Active chat session ID — null means "new chat"
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [activeTarget, setActiveTarget] = useState<CelestialTarget | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null)
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('dark')
    return () => {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true })
    }
  }, [user, loading, navigate])

  // Network status detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Show welcome modal once per session
  useEffect(() => {
    if (user && !sessionStorage.getItem('orion_welcomed')) {
      setShowWelcome(true)
    }
  }, [user])

  const handleBeginExploration = () => {
    setShowWelcome(false)
    sessionStorage.setItem('orion_welcomed', 'true')
    window.speechSynthesis.cancel() // Cut off the voice if they click while it's talking
  }

  if (loading || !user) {
    return null // or a loading spinner
  }

  return (
    <DashboardBackground>
      {showWelcome && <DashboardWelcomeModal onClose={handleBeginExploration} />}
      <DashboardHeader />
      {isOffline && (
        <div className="absolute inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-red-500 mb-6 animate-pulse">
            <span className="material-symbols-outlined text-7xl drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
              wifi_off
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-red-500 tracking-[0.3em] drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] text-center">
            SYSTEM OFFLINE
          </h1>
          <p className="text-red-400/70 font-mono tracking-widest mt-6 uppercase text-sm animate-pulse text-center">
            CRITICAL ERROR: Lost connection to orbital network.
          </p>
          <div className="mt-8 flex gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
            <div
              className="w-2 h-2 bg-red-500 rounded-full animate-ping"
              style={{ animationDelay: '0.2s' }}
            ></div>
            <div
              className="w-2 h-2 bg-red-500 rounded-full animate-ping"
              style={{ animationDelay: '0.4s' }}
            ></div>
          </div>
        </div>
      )}
      <main className="flex-1 min-h-0 w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-4 px-4 pb-4 overflow-hidden relative z-10">
        <DashboardSidebarLeft
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewChat={handleNewChat}
        />
        <DashboardChatSection
          activeSessionId={activeSessionId}
          onSessionCreated={setActiveSessionId}
          onUpdateTarget={setActiveTarget}
        />
        <DashboardSidebarRight targetData={activeTarget} />
      </main>
      <DashboardFooter />
    </DashboardBackground>
  )
}
