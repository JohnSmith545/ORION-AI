import React, { useEffect } from 'react'
import { DashboardBackground } from '../components/dashboard/DashboardBackground'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DashboardSidebarLeft } from '../components/dashboard/DashboardSidebarLeft'
import { DashboardSidebarRight } from '../components/dashboard/DashboardSidebarRight'
import { DashboardChatSection } from '../components/dashboard/DashboardChatSection'
import { DashboardFooter } from '../components/dashboard/DashboardFooter'

/**
 * ORION AI Intelligence Dashboard
 *
 * Three-column layout: Mission Feed (left), Chat (center), System Status (right).
 * Ensures dark mode is active for the dashboard theme.
 */
export const Dashboard: React.FC = () => {
  useEffect(() => {
    document.documentElement.classList.add('dark')
    return () => {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  return (
    <DashboardBackground>
      <DashboardHeader />
      <main className="flex-1 w-full max-w-[1600px] mx-auto grid grid-cols-[260px_1fr_260px] relative z-10 overflow-hidden pb-12 pt-4 gap-6 px-6">
        <DashboardSidebarLeft />
        <DashboardChatSection />
        <DashboardSidebarRight />
      </main>
      <DashboardFooter />
    </DashboardBackground>
  )
}
