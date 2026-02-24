import React from 'react'
import { Celestial3DViewer } from './Celestial3DViewer'

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

  return (
    <aside className="glass-panel rounded-xl flex flex-col py-6 px-4 relative shadow-panel-glow w-full lg:w-[260px] flex-shrink-0 z-10">
      <div className="space-y-6 flex-1">
        {/* TELEMETRY HEADER */}
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50 mb-4 flex items-center justify-between border-b border-white/10 pb-2">
            <span>Telemetry</span>
            <span
              className={`material-symbols-outlined text-sm ${hasTarget ? 'text-primary animate-pulse' : 'text-white/20 animate-pulse'}`}
            >
              my_location
            </span>
          </h3>

          {/* 3D HOLO TARGET */}
          <div
            className={`relative h-48 w-48 mx-auto mb-6 mt-4 transition-opacity duration-700 ${hasTarget ? 'opacity-100' : 'opacity-40'}`}
          >
            {targetData?.imageUrl ? (
              <img
                src={targetData.imageUrl}
                alt={targetData.name}
                onError={e => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
                className="absolute inset-8 w-[calc(100%-4rem)] h-[calc(100%-4rem)] rounded-full object-cover mix-blend-screen opacity-90 z-10 border border-primary/30 shadow-[0_0_30px_rgba(0,242,255,0.3)]"
              />
            ) : (
              <Celestial3DViewer targetType={targetData?.type} targetName={targetData?.name} />
            )}
          </div>

          {/* TARGET DATA */}
          <div className="text-center mb-5">
            <div
              className={`text-sm font-display font-bold tracking-widest ${hasTarget ? 'text-white drop-shadow-[0_0_5px_rgba(0,242,255,0.5)]' : 'text-white/30'}`}
            >
              {targetData?.name ?? 'NO TARGET LOCKED'}
            </div>
            <div
              className={`text-[9px] font-mono mt-2 uppercase inline-block px-2 py-1 rounded border ${hasTarget ? 'text-primary bg-primary/10 border-primary/30 shadow-[0_0_10px_rgba(0,242,255,0.1)]' : 'text-white/30 bg-white/5 border-white/10'}`}
            >
              Class: {targetData?.type ?? '---'}
            </div>
          </div>

          {/* DESCRIPTION */}
          {hasTarget && targetData.description && (
            <div className="text-[10px] text-white/70 font-light leading-relaxed bg-white/5 p-3 rounded border border-white/5 mb-4">
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
        </div>

        {/* SENSOR STATUS */}
        <div className="pt-4">
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

      {/* SPECTRAL GRAPH */}
      <div className="mt-auto opacity-70 pt-6">
        <div className="h-16 border border-white/10 rounded-lg relative overflow-hidden flex items-end justify-center gap-1.5 p-2 bg-black/20 shadow-inner">
          <div className="w-1.5 bg-gradient-to-t from-accent-violet/60 to-transparent h-[40%] animate-pulse rounded-t-sm"></div>
          <div
            className="w-1.5 bg-gradient-to-t from-accent-violet/60 to-transparent h-[80%] animate-pulse rounded-t-sm"
            style={{ animationDelay: '0.1s' }}
          ></div>
          <div
            className="w-1.5 bg-gradient-to-t from-primary/60 to-transparent h-[100%] animate-pulse rounded-t-sm shadow-[0_0_10px_rgba(0,242,255,0.4)]"
            style={{ animationDelay: '0.2s' }}
          ></div>
          <div
            className="w-1.5 bg-gradient-to-t from-primary/80 to-transparent h-[60%] animate-pulse rounded-t-sm"
            style={{ animationDelay: '0.3s' }}
          ></div>
          <div
            className="w-1.5 bg-gradient-to-t from-primary/60 to-transparent h-[30%] animate-pulse rounded-t-sm"
            style={{ animationDelay: '0.1s' }}
          ></div>
        </div>
        <div className="text-center mt-2 text-[8px] font-mono text-primary/40 tracking-widest">
          SPECTRAL_SIGNATURE
        </div>
      </div>
    </aside>
  )
}
