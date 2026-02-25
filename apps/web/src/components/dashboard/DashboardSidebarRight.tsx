import { useState } from 'react'
import { Celestial3DViewer } from './Celestial3DViewer'
import { ObservatoryModal } from './ObservatoryModal'

export interface CelestialTarget {
  name: string
  type: string
  ra: string
  dec: string
  distance: string
  description: string
  imageUrl?: string | null
}

interface DashboardSidebarRightProps {
  targetData?: CelestialTarget | null
}

export const DashboardSidebarRight: React.FC<DashboardSidebarRightProps> = ({ targetData }) => {
  const hasTarget = !!targetData
  const [isModalOpen, setIsModalOpen] = useState(false)

  const is3DObject = targetData?.type
    ? [
        'planet',
        'star',
        'moon',
        'satellite',
        'gas giant',
        'dwarf',
        'sun',
        'terrestrial',
        'main-sequence',
        'rocky',
        'jovian',
        'ice giant',
        'exoplanet',
      ].some(keyword => targetData.type.toLowerCase().includes(keyword))
    : false

  return (
    <aside className="hidden lg:flex glass-panel rounded-xl flex-col py-6 px-4 relative shadow-panel-glow w-full lg:w-[260px] h-full flex-shrink-0 z-10 overflow-hidden">
      {/* 1. FIXED HEADER */}
      <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50 mb-4 flex items-center justify-between border-b border-white/10 pb-2 flex-shrink-0">
        <span>Telemetry</span>
        <span
          className={`material-symbols-outlined text-sm ${hasTarget ? 'text-primary animate-pulse' : 'text-white/20 animate-pulse'}`}
        >
          my_location
        </span>
      </h3>

      {/* 2. SCROLLABLE MIDDLE CONTENT */}
      <div className="flex-1 overflow-y-auto pr-1 chat-scroll space-y-6 mb-4">
        {/* 3D HOLO TARGET / IMAGE */}
        <div
          className={`relative h-44 w-44 mx-auto mt-2 transition-opacity duration-700 flex-shrink-0 ${hasTarget ? 'opacity-100' : 'opacity-40'}`}
        >
          {targetData?.imageUrl && !is3DObject ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] rounded-full z-10 group overflow-hidden border border-primary/30 shadow-[0_0_30px_rgba(0,242,255,0.3)] transition-transform hover:scale-105"
            >
              <img
                src={targetData.imageUrl}
                alt={targetData.name}
                className="w-full h-full object-cover mix-blend-screen opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <span className="material-symbols-outlined text-primary text-2xl drop-shadow-[0_0_10px_rgba(0,242,255,1)]">
                  fullscreen
                </span>
              </div>
            </button>
          ) : (
            <div className="absolute inset-0 z-10 w-full h-full flex items-center justify-center p-2">
              <div className="w-full h-full rounded-full overflow-hidden">
                <Celestial3DViewer
                  targetType={targetData?.type || 'planet'}
                  targetName={targetData?.name || ''}
                />
              </div>
            </div>
          )}
        </div>

        {/* TARGET NAME & CLASS */}
        <div className="text-center">
          <div
            className={`text-sm font-display font-bold tracking-widest leading-tight ${hasTarget ? 'text-white drop-shadow-[0_0_5px_rgba(0,242,255,0.5)]' : 'text-white/30'}`}
          >
            {targetData?.name ?? 'NO TARGET LOCKED'}
          </div>
          <div
            className={`text-[9px] font-mono mt-2 uppercase inline-block px-2 py-1 rounded border ${hasTarget ? 'text-primary bg-primary/10 border-primary/30 shadow-[0_0_10px_rgba(0,242,255,0.1)]' : 'text-white/30 bg-white/5 border-white/10'}`}
          >
            Class: {targetData?.type ?? '---'}
          </div>
        </div>

        {/* DESCRIPTION - Scrollable if long */}
        {hasTarget && targetData.description && (
          <div className="text-[10px] text-white/70 font-light leading-relaxed bg-white/5 p-3 rounded border border-white/5 italic">
            {targetData.description}
          </div>
        )}

        {/* COORDINATES GRID */}
        <div className="space-y-2 bg-black/40 p-3 rounded-lg border border-white/5 shadow-inner">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">
              R.A.
            </span>
            <span
              className={`text-[10px] font-mono ${hasTarget ? 'text-primary/90' : 'text-white/20'}`}
            >
              {targetData?.ra ?? '--h --m --s'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">
              DEC.
            </span>
            <span
              className={`text-[10px] font-mono ${hasTarget ? 'text-primary/90' : 'text-white/20'}`}
            >
              {targetData?.dec ?? '--° --\' --"'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">
              DIST.
            </span>
            <span
              className={`text-[10px] font-mono ${hasTarget ? 'text-primary/90' : 'text-white/20'}`}
            >
              {targetData?.distance ?? '--- LY'}
            </span>
          </div>
        </div>

        {/* SENSOR STATUS */}
        <div className="pt-2">
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50 mb-3 text-right border-b border-white/10 pb-2">
            Active Scanners
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-light text-white/80 p-2 rounded bg-white/5 border border-white/5">
              <span className="uppercase tracking-widest text-white/60">Optical Array</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${hasTarget ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-yellow-500/50 shadow-[0_0_5px_#eab308] animate-pulse'}`}
              ></span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-light text-white/80 p-2 rounded bg-white/5 border border-white/5">
              <span className="uppercase tracking-widest text-white/60">Spectrometer</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${hasTarget ? 'bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse' : 'bg-yellow-500/50 shadow-[0_0_5px_#eab308] animate-pulse'}`}
              ></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FIXED SPECTRAL GRAPH (FOOTER) */}
      <div className="mt-auto opacity-70 pt-4 border-t border-white/5 flex-shrink-0">
        <div className="h-12 border border-white/10 rounded-lg relative overflow-hidden flex items-end justify-center gap-1 p-2 bg-black/20">
          <div className="w-1.5 bg-gradient-to-t from-accent-violet/60 to-transparent h-[40%] animate-pulse rounded-t-sm"></div>
          <div
            className="w-1.5 bg-gradient-to-t from-primary/60 to-transparent h-[100%] animate-pulse rounded-t-sm shadow-[0_0_10px_rgba(0,242,255,0.4)]"
            style={{ animationDelay: '0.2s' }}
          ></div>
          <div
            className="w-1.5 bg-gradient-to-t from-primary/80 to-transparent h-[60%] animate-pulse rounded-t-sm"
            style={{ animationDelay: '0.3s' }}
          ></div>
        </div>
        <div className="text-center mt-2 text-[8px] font-mono text-primary/40 tracking-widest uppercase">
          Spectral_Signature
        </div>
      </div>

      {isModalOpen && targetData && (
        <ObservatoryModal targetData={targetData} onClose={() => setIsModalOpen(false)} />
      )}
    </aside>
  )
}
