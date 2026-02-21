import React from 'react'

/**
 * DashboardBackground
 *
 * Full-viewport cosmic background for the ORION Intelligence Dashboard.
 * Matches the reference layering: base dark, cosmos image, gradient, planet-arc,
 * crescent-glow, star-field, centered rings, then neon grid, orbital trajectories,
 * constellation lines, telemetry markers, shooting stars.
 */
interface DashboardBackgroundProps {
  children: React.ReactNode
}

export const DashboardBackground: React.FC<DashboardBackgroundProps> = ({ children }) => {
  return (
    <div className="font-body text-white/80 h-screen w-full overflow-hidden relative flex flex-col bg-obsidian">
      {/* Base and image layers */}
      <div className="fixed inset-0 z-[-3] bg-cosmos opacity-40" />
      <div className="fixed inset-0 z-[-2] bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
      <div className="fixed inset-0 z-[-1] planet-arc" />
      <div className="fixed inset-0 z-[-1] crescent-glow animate-pulse-slow" />
      <div
        className="fixed inset-0 z-[-1] star-field animate-spin-slow"
        style={{ animationDuration: '200s' }}
      />

      {/* Centered orbital rings (reference: 1200px, 900px) */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] border border-white/5 rounded-full animate-spin-slow pointer-events-none z-[-1]" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-white/5 rounded-full animate-spin-reverse-slow pointer-events-none z-[-1]" />

      {/* Full-viewport decorative layer */}
      <div className="fixed inset-0 z-[-2] pointer-events-none overflow-hidden">
        <div className="absolute inset-0 neon-grid opacity-10" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle, #00f2ff 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        {/* Orbital trajectories */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1600px] h-[1600px] border border-primary/10 rounded-full animate-spin-slow opacity-20" />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2000px] h-[2000px] border border-accent-violet/5 rounded-full animate-spin-reverse-slow opacity-10"
          style={{ animationDuration: '150s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] border border-primary/5 rounded-[50%] rotate-[30deg] opacity-10 animate-pulse" />
        {/* Constellation lines */}
        <div className="absolute top-[20%] left-[30%] w-32 constellation-line rotate-[45deg]" />
        <div className="absolute top-[25%] left-[35%] w-24 constellation-line rotate-[-15deg]" />
        <div className="absolute bottom-[30%] right-[25%] w-40 constellation-line rotate-[110deg]" />
        <div className="absolute top-[60%] right-[10%] w-20 constellation-line rotate-[20deg]" />
        <div className="absolute top-[18%] left-[12%] w-16 constellation-line rotate-[15deg] opacity-20" />
        <div className="absolute top-[45%] left-[8%] w-28 constellation-line rotate-[60deg] opacity-20" />
        <div className="absolute bottom-[15%] left-[40%] w-36 constellation-line rotate-[-10deg] opacity-20" />
        <div className="absolute top-[10%] right-[35%] w-20 constellation-line rotate-[140deg] opacity-20" />
        <div className="absolute bottom-[40%] right-[5%] w-24 constellation-line rotate-[30deg] opacity-20" />
        {/* Telemetry markers */}
        <div className="absolute top-[15%] left-[10%] animate-pulse opacity-20">
          <div className="text-[8px] font-mono text-primary mb-1">RA: 14h 29m 42s</div>
          <div className="w-12 h-[1px] bg-primary/30" />
        </div>
        <div
          className="absolute bottom-[20%] right-[15%] animate-pulse opacity-20"
          style={{ animationDelay: '2s' }}
        >
          <div className="text-[8px] font-mono text-primary mb-1">DEC: -62° 40&apos; 46&quot;</div>
          <div className="w-12 h-[1px] bg-primary/30" />
        </div>
        {/* Decorative icons */}
        <div className="absolute top-[40%] right-[5%] flex flex-col gap-8 opacity-10">
          <span className="material-symbols-outlined text-[40px] text-white rotate-45">
            close_fullscreen
          </span>
          <span className="material-symbols-outlined text-[40px] text-white -rotate-12">
            view_in_ar
          </span>
        </div>
        {/* Shooting stars */}
        <div className="shooting-star" style={{ top: '10%', right: '10%', animationDelay: '2s' }} />
        <div
          className="shooting-star"
          style={{
            top: '30%',
            right: '-5%',
            animationDelay: '7s',
            animationDuration: '8s',
          }}
        />
        <div className="shooting-star" style={{ top: '0%', right: '40%', animationDelay: '15s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col w-full">{children}</div>
    </div>
  )
}
