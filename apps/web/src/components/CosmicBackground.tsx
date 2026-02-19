import React from 'react'

/**
 * CosmicBackground Component
 *
 * Precisely refactored to ensure correct layering.
 * Background color moved to a separate layer at z-[-4] to prevent
 * obscuring negative z-index children.
 */
export const CosmicBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="font-body text-white/80 h-screen w-full overflow-hidden relative flex items-center justify-center">
      {/* Background Color Layer (Bottom-most) */}
      <div className="fixed inset-0 z-[-4] bg-background-dark"></div>

      {/* Background Layers */}
      <div className="fixed inset-0 z-[-3] bg-cosmos opacity-40"></div>
      <div className="fixed inset-0 z-[-2] bg-gradient-to-b from-black/80 via-black/40 to-black/90"></div>
      <div className="fixed inset-0 z-[-1] planet-arc"></div>

      {/* 
        Milkyway Radial Ring (Crescent Glow)
        Note: Exact positioning from provided HTML
      */}
      <div className="fixed inset-0 z-[-1] crescent-glow animate-pulse-slow"></div>

      <div
        className="fixed inset-0 z-[-1] star-field animate-spin-slow"
        style={{ animationDuration: '200s' }}
      ></div>

      {/* Orbital Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full animate-spin-slow pointer-events-none orbital-ring opacity-60"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full animate-spin-reverse-slow pointer-events-none orbital-ring opacity-70"></div>

      {/* Content Area */}
      <div className="relative z-10 w-full max-w-md px-6 animate-float">{children}</div>
    </div>
  )
}
