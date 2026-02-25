import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import './style.css'

// Lazy load pages for Lighthouse Performance (Code Splitting)
const Auth = React.lazy(() => import('./pages/Auth'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const NotFound = React.lazy(() => import('./pages/NotFound'))

// Sleek loading fallback for Suspense
const GlobalLoader = () => (
  <div className="min-h-screen bg-[#050505] flex items-center justify-center">
    <div className="w-12 h-12 rounded-full border border-primary/30 border-t-primary animate-spin shadow-[0_0_15px_rgba(0,242,255,0.5)]"></div>
  </div>
)

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <GlobalLoader />
  if (!user) return <Navigate to="/auth" />
  return <>{children}</>
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<GlobalLoader />}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
