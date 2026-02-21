import React from 'react'

export const DashboardHeader: React.FC = () => {
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
      <div className="absolute right-8 top-8 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shadow-[0_0_5px_#00f2ff]" />
          <span className="text-[9px] font-mono text-white/50 tracking-widest uppercase">
            Net: Secure
          </span>
        </div>
        <button
          type="button"
          className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
          aria-label="Settings"
        >
          <span className="material-symbols-outlined text-sm text-white/50">settings</span>
        </button>
      </div>
      <div className="absolute left-8 top-8">
        <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase">
          V.2.0.4 [ALPHA]
        </span>
      </div>
    </header>
  )
}
