import React from 'react'
import { useAuth } from '../../hooks/useAuth'

export const DashboardHeader: React.FC = () => {
  const { user, logout } = useAuth()

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

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors group/btn"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined text-sm text-white/50 group-hover:text-white transition-colors">
              settings
            </span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="h-8 px-3 rounded-full border border-red-500/20 bg-red-500/5 flex items-center gap-2 hover:bg-red-500/10 hover:border-red-500/40 transition-all group/logout"
            aria-label="Logout"
          >
            <span className="material-symbols-outlined text-xs text-red-400 group-hover:text-red-300">
              logout
            </span>
            <span className="text-[9px] font-mono text-red-400/80 group-hover:text-red-300 uppercase tracking-wider">
              Exit
            </span>
          </button>
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
