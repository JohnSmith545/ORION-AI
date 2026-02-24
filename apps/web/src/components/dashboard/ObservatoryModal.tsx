import React from 'react'
import { CelestialTarget } from './DashboardSidebarRight'

interface ObservatoryModalProps {
  targetData: CelestialTarget
  onClose: () => void
}

export const ObservatoryModal: React.FC<ObservatoryModalProps> = ({ targetData, onClose }) => {
  if (!targetData.imageUrl) return null

  const handleNasaRedirect = () => {
    // Redirects to NASA's official image gallery using the object's name
    window.open(`https://images.nasa.gov/search?q=${encodeURIComponent(targetData.name)}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8 backdrop-blur-xl bg-black/80">
      {/* HUD Background Grid */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,242,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,242,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <div className="relative w-full max-w-6xl h-full max-h-[85vh] flex flex-col lg:flex-row gap-6 glass-panel border border-primary/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,242,255,0.15)] animate-in fade-in zoom-in duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-black border border-primary/50 text-primary flex items-center justify-center hover:bg-primary/20 hover:scale-110 transition-all z-50 shadow-[0_0_20px_rgba(0,242,255,0.3)]"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Left Side: The Image Viewer */}
        <div className="relative flex-1 rounded-xl overflow-hidden bg-black/50 border border-white/10 group flex items-center justify-center">
          {/* Decorative HUD Corners */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary/50 z-20"></div>
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/50 z-20"></div>
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary/50 z-20"></div>
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary/50 z-20"></div>

          <img
            src={targetData.imageUrl}
            alt={targetData.name}
            className="w-full h-full object-contain z-10"
          />

          {/* Scanning Line Animation */}
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/30 shadow-[0_0_15px_rgba(0,242,255,0.5)] z-20 animate-[float_4s_ease-in-out_infinite]"></div>
        </div>

        {/* Right Side: Data Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          <div className="border-b border-primary/30 pb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-primary/30 bg-primary/10 text-primary text-[9px] font-mono tracking-widest uppercase mb-4 animate-pulse">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              Optical Link Established
            </div>
            <h2 className="text-3xl font-display text-white tracking-widest drop-shadow-[0_0_10px_rgba(0,242,255,0.4)]">
              {targetData.name}
            </h2>
            <div className="text-xs font-mono text-primary/80 mt-1 uppercase">
              {targetData.type}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-sm text-white/70 font-light leading-relaxed">
            {targetData.description ||
              'Awaiting further telemetric breakdown from Vertex AI core...'}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono p-3 bg-black/40 rounded border border-white/5 shadow-inner">
            <div className="text-white/40">R.A.</div>
            <div className="text-right text-primary">{targetData.ra}</div>
            <div className="text-white/40">DEC.</div>
            <div className="text-right text-primary">{targetData.dec}</div>
            <div className="text-white/40">DISTANCE</div>
            <div className="text-right text-primary">{targetData.distance}</div>
          </div>

          <button
            onClick={handleNasaRedirect}
            className="w-full relative group px-4 py-4 rounded-lg bg-primary/10 border border-primary/40 text-primary font-display tracking-[0.2em] text-[10px] uppercase transition-all duration-300 hover:bg-primary/20 hover:shadow-[0_0_30px_rgba(0,242,255,0.3)] flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-base">travel_explore</span>
            Access NASA Archives
            <div className="absolute inset-0 rounded-lg border border-primary/20 animate-ping opacity-20 group-hover:opacity-40"></div>
          </button>
        </div>
      </div>
    </div>
  )
}
