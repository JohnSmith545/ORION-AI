import React from 'react'

export const DashboardSidebarLeft: React.FC = () => {
  return (
    <aside className="glass-panel rounded-xl flex flex-col justify-between py-6 px-4 relative overflow-hidden shadow-panel-glow">
      <div className="space-y-8">
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 mb-4 flex items-center gap-2 border-b border-primary/20 pb-2">
            <span className="material-symbols-outlined text-sm">history</span>
            Mission Feed
          </h3>
          <ul className="space-y-4">
            <li className="group cursor-pointer p-2 rounded hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10">
              <div className="text-xs text-white/90 font-medium group-hover:text-primary transition-colors">
                Kepler Trajectory
              </div>
              <div className="text-[9px] text-white/40 mt-0.5">T-minus 4h 20m</div>
            </li>
            <li className="group cursor-pointer p-2 rounded hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10">
              <div className="text-xs text-white/90 font-medium group-hover:text-primary transition-colors">
                Nebula Analysis
              </div>
              <div className="text-[9px] text-white/40 mt-0.5">Complete</div>
            </li>
            <li className="group cursor-pointer p-2 rounded hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10">
              <div className="text-xs text-white/90 font-medium group-hover:text-primary transition-colors">
                Star Chart Delta
              </div>
              <div className="text-[9px] text-primary/60 mt-0.5 animate-pulse">Processing...</div>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50 mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
            <span className="material-symbols-outlined text-sm">folder_open</span>
            Archives
          </h3>
          <ul className="space-y-2 opacity-80">
            <li className="text-xs text-white/60 font-light hover:text-white cursor-pointer px-2 py-1.5 rounded hover:bg-white/5 transition-colors">
              Sector 7 Logs
            </li>
            <li className="text-xs text-white/60 font-light hover:text-white cursor-pointer px-2 py-1.5 rounded hover:bg-white/5 transition-colors">
              Void Signals
            </li>
          </ul>
        </div>
      </div>
      <div className="opacity-60 mt-4">
        <div className="w-full h-24 border border-white/10 relative overflow-hidden bg-black/20 rounded-md">
          <div
            className="absolute top-0 left-0 w-full h-[1px] bg-primary/50 animate-float"
            style={{ animationDuration: '3s' }}
          />
          <div className="absolute bottom-2 left-2 text-[8px] font-mono text-primary/70">
            SIGNAL_STRENGTH
          </div>
          <div className="flex items-end justify-between px-2 pb-4 h-full gap-1">
            <div className="w-1 bg-primary/30 h-1/2" />
            <div className="w-1 bg-primary/40 h-3/4" />
            <div className="w-1 bg-primary/20 h-1/3" />
            <div className="w-1 bg-primary/60 h-full shadow-[0_0_5px_rgba(0,242,255,0.4)]" />
            <div className="w-1 bg-primary/40 h-2/3" />
            <div className="w-1 bg-primary/20 h-1/4" />
          </div>
        </div>
      </div>
    </aside>
  )
}
