import React from 'react'

export const DashboardSidebarRight: React.FC = () => {
  return (
    <aside className="glass-panel rounded-xl flex flex-col py-6 px-4 relative shadow-panel-glow">
      <div className="space-y-8">
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50 mb-4 flex items-center gap-2 justify-end border-b border-white/10 pb-2">
            System Status
            <span className="material-symbols-outlined text-sm">grid_view</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="status-card rounded-md p-3 text-center group">
              <div className="text-[9px] text-white/50 uppercase mb-1">CPU</div>
              <div className="text-sm text-primary font-mono font-medium drop-shadow-[0_0_5px_rgba(0,242,255,0.4)]">
                12%
              </div>
            </div>
            <div className="status-card rounded-md p-3 text-center group">
              <div className="text-[9px] text-white/50 uppercase mb-1">Mem</div>
              <div className="text-sm text-primary font-mono font-medium drop-shadow-[0_0_5px_rgba(0,242,255,0.4)]">
                4.2TB
              </div>
            </div>
            <div className="status-card rounded-md p-3 text-center group">
              <div className="text-[9px] text-white/50 uppercase mb-1">Net</div>
              <div className="text-sm text-accent-violet font-mono font-medium drop-shadow-[0_0_5px_rgba(139,92,246,0.4)]">
                10Gb
              </div>
            </div>
            <div className="status-card rounded-md p-3 text-center group">
              <div className="text-[9px] text-white/50 uppercase mb-1">Q-Bit</div>
              <div className="text-sm text-primary font-mono font-medium drop-shadow-[0_0_5px_rgba(0,242,255,0.4)]">
                Stable
              </div>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50 mb-4 text-right border-b border-white/10 pb-2">
            Active Nodes
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-light text-white/80 p-2 rounded bg-white/5 border border-white/5">
              <span>Alpha Centauri</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            </div>
            <div className="flex items-center justify-between text-xs font-light text-white/80 p-2 rounded bg-white/5 border border-white/5">
              <span>Betelgeuse</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            </div>
            <div className="flex items-center justify-between text-xs font-light text-white/80 p-2 rounded bg-white/5 border border-white/5">
              <span>Andromeda Link</span>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_#eab308] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-auto opacity-70">
        <div className="h-32 border border-white/10 rounded-lg relative overflow-hidden flex items-end justify-center gap-1.5 p-3 bg-black/20 shadow-inner">
          <div className="w-1.5 bg-gradient-to-t from-primary/60 to-transparent h-[40%] animate-pulse rounded-t-sm" />
          <div
            className="w-1.5 bg-gradient-to-t from-primary/60 to-transparent h-[70%] animate-pulse rounded-t-sm"
            style={{ animationDelay: '0.1s' }}
          />
          <div
            className="w-1.5 bg-gradient-to-t from-primary/60 to-transparent h-[50%] animate-pulse rounded-t-sm"
            style={{ animationDelay: '0.2s' }}
          />
          <div
            className="w-1.5 bg-gradient-to-t from-primary/80 to-transparent h-[80%] animate-pulse rounded-t-sm shadow-[0_0_10px_rgba(0,242,255,0.2)]"
            style={{ animationDelay: '0.3s' }}
          />
          <div
            className="w-1.5 bg-gradient-to-t from-primary/60 to-transparent h-[60%] animate-pulse rounded-t-sm"
            style={{ animationDelay: '0.1s' }}
          />
          <div className="w-1.5 bg-gradient-to-t from-primary/60 to-transparent h-[30%] animate-pulse rounded-t-sm" />
        </div>
        <div className="text-center mt-2 text-[8px] font-mono text-primary/40 tracking-widest">
          NEURAL_ACTIVITY
        </div>
      </div>
    </aside>
  )
}
