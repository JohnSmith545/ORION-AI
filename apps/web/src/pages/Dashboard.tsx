import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DashboardBackground } from '../components/dashboard/DashboardBackground'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DashboardSidebarLeft } from '../components/dashboard/DashboardSidebarLeft'
import { DashboardSidebarRight } from '../components/dashboard/DashboardSidebarRight'
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
      <main className="flex-1 min-h-0 w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-4 px-4 pb-4 overflow-hidden relative z-10">
        <DashboardSidebarLeft
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewChat={handleNewChat}
        />
        <DashboardChatSection
          activeSessionId={activeSessionId}
          onSessionCreated={setActiveSessionId}
        />
        <DashboardSidebarRight />
      </main>
      <DashboardFooter />
    </DashboardBackground>
  )
}
