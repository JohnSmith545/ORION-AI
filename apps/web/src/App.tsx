/**
 * =============================================================================
 * WELCOME TO THE HYTEL WAY: MONOREPO STACK
 * =============================================================================
 *
 * This file demonstrates the key concepts of our tech stack using friendly
 * analogies. Think of building a web app like putting on a theater production!
 *
 * THE STACK EXPLAINED (Theater Analogy):
 *
 * PNPM (Package Manager)
 *    -> "The super-organized prop master"
 *    -> Manages all the tools/packages we need, storing them efficiently
 *    -> Unlike npm, it doesn't duplicate packages - saves space!
 *
 * TURBOREPO (Monorepo Build System)
 *    -> "The stage manager who coordinates everything"
 *    -> Runs tasks (build, test, dev) across multiple packages smartly
 *    -> Caches results so repeated tasks are lightning fast!
 *
 * REACT + VITE (Frontend Framework + Build Tool)
 *    -> "The stage and lighting system"
 *    -> React: Builds the interactive UI (the actors on stage)
 *    -> Vite: Super-fast dev server (instant lighting changes!)
 *
 * TAILWIND CSS + SHADCN UI (Styling)
 *    -> "The costume designer"
 *    -> Tailwind: Utility classes for quick styling (fabric swatches)
 *    -> Shadcn UI: Pre-made, beautiful component patterns (costume templates)
 *
 * @repo/ui (Shared Component Package)
 *    -> "The shared costume closet"
 *    -> Components here (Header, Button, Card) can be used by ANY app!
 *    -> Located in: packages/ui/
 *
 * @repo/shared (Shared Types & Schemas)
 *    -> "The spellbook of shared rules"
 *    -> Zod schemas define what data looks like (validation spells!)
 *    -> Located in: packages/shared/
 *
 * tRPC + TanStack Query (API Layer)
 *    -> "The messenger system between actors"
 *    -> tRPC: Type-safe communication with backend (no lost messages!)
 *    -> TanStack Query: Smart caching of server data (remembers the script!)
 *
 * =============================================================================
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './style.css'

// Import our new Cosmic Authentication page
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'

/**
 * Main App Component
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Navigate to="/auth" replace />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
