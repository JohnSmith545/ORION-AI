import React from 'react'

export const DashboardFooter: React.FC = () => {
  return (
    <div className="w-full text-center py-4 relative z-20">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/5 backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e] animate-pulse" />
        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
          System Operational
        </span>
      </div>
    </div>
  )
}
