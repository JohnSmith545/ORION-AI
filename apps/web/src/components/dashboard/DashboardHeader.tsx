import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

export const DashboardHeader: React.FC = () => {
  const { user, logout, role } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="w-full h-20 flex items-center justify-center relative z-20 pt-6">
      <div className="text-center group cursor-pointer">
        <div className="inline-flex items-center justify-center relative">
          <span className="material-symbols-outlined text-3xl text-white font-thin relative z-10 drop-shadow-[0_0_15px_rgba(0,242,255,0.6)] group-hover:text-primary transition-colors duration-500">
            blur_on
          </span>
          <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
        <h1 className="font-display text-xl tracking-[0.3em] font-light text-white drop-shadow-[0_0_10px_rgba(0,242,255,0.5)] mt-1">
          ORION<span className="font-bold">AI</span>
        </h1>
      </div>
      <div className="absolute right-8 top-8 flex items-center gap-6">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-mono text-primary tracking-widest uppercase">
            {user?.displayName || user?.email?.split('@')[0] || 'Unknown Operator'}
          </span>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-primary/50 shadow-[0_0_5px_#00f2ff]" />
            <span className="text-[8px] font-mono text-white/30 tracking-widest uppercase">
              Authenticated
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-colors group/btn ${isMenuOpen ? 'bg-white/10 border-white/30 text-white' : 'hover:bg-white/5'}`}
            aria-label="Account menu"
            aria-expanded={isMenuOpen}
          >
            <span
              className={`material-symbols-outlined text-sm transition-colors ${isMenuOpen ? 'text-white' : 'text-white/50 group-hover:text-white'}`}
            >
              settings
            </span>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-3 w-64 bg-[#0A0A0A]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50">
              {/* Account Info Section */}
              <div className="px-4 py-3 border-b border-white/5">
                <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
                  Account
                </span>
                <div className="mt-2 space-y-1.5">
                  {user?.displayName && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px] text-primary/70">
                        person
                      </span>
                      <span className="text-xs font-mono text-white/80 truncate">
                        {user.displayName}
                      </span>
                    </div>
                  )}
                  {user?.email && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px] text-primary/70">
                        mail
                      </span>
                      <span className="text-xs font-mono text-white/60 truncate">{user.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-primary/70">
                      shield
                    </span>
                    <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
                      {role}
                    </span>
                  </div>
                </div>
              </div>
              {/* Logout */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false)
                  logout()
                }}
                className="w-full px-4 py-2.5 mt-1 text-left flex items-center gap-3 hover:bg-red-500/10 transition-colors group/logout"
                aria-label="Logout"
              >
                <span className="material-symbols-outlined text-[18px] text-red-500/70 group-hover/logout:text-red-400">
                  logout
                </span>
                <span className="text-xs font-mono text-red-500/70 group-hover/logout:text-red-400 uppercase tracking-wider">
                  Logout
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="absolute left-8 top-8">
        <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase">
          V.2.0.4 [ALPHA]
        </span>
      </div>
    </header>
  )
}
