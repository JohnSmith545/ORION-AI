import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <span className="font-display font-bold text-[30vw] tracking-tighter text-white">404</span>
      </div>
      <span className="material-symbols-outlined text-primary text-6xl mb-4 relative z-10">
        satellite_alt
      </span>
      <h1 className="text-3xl font-display font-light text-white tracking-widest mb-2 relative z-10">
        ORBIT DECAYED
      </h1>
      <p className="text-white/50 font-mono text-sm max-w-md mb-6 relative z-10">
        The sector you are looking for does not exist in the current star chart.
      </p>
      <Link
        to="/"
        className="px-6 py-2 border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-mono text-xs uppercase tracking-widest rounded relative z-10"
      >
        Return to Base
      </Link>
    </div>
  )
}
