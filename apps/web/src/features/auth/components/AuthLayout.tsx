import React from 'react'

interface AuthLayoutProps {
  title: React.ReactNode
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
  progress?: number
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
  footer,
  progress = 0,
}) => {
  // Calculate card glow based on progress
  const cardGlowOpacity = progress * 0.6 // Increased intensity
  const cardGlowBlur = 10 + progress * 90 // Wider spread
  const glowColor = progress > 0.5 ? 'bg-accent-violet' : 'bg-primary'
  const glowShadow = `0 0 ${20 + progress * 60}px rgba(${progress > 0.5 ? '139, 92, 246' : '0, 242, 255'}, ${0.1 + progress * 0.4})`
  return (
    <>
      <div className="text-center mb-[clamp(2rem,6vh,3rem)] relative">
        <div className="inline-flex items-center justify-center mb-4 relative">
          <span className="material-symbols-outlined text-[clamp(3rem,10vw,4.5rem)] text-white font-thin relative z-10 drop-shadow-[0_0_15px_rgba(0,242,255,0.6)] text-primary">
            blur_on
          </span>
          <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full"></div>
        </div>
        <h1 className="font-display text-[clamp(2rem,8vw,3.5rem)] tracking-[0.3em] font-light text-white drop-shadow-[0_0_10px_rgba(0,242,255,0.5)] uppercase">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[clamp(0.7rem,2vw,0.875rem)] font-mono uppercase tracking-[0.4em] text-white/40">
            {subtitle}
          </p>
        )}
      </div>

      <div
        className="relative group/card-container transition-all duration-700 ease-out"
        style={{
          boxShadow: glowShadow,
          transform: `scale(${1 + progress * 0.08})`,
        }}
      >
        {/* Dynamic Card Glow Layer */}
        <div
          className={`absolute inset-0 ${glowColor}/30 rounded-2xl pointer-events-none transition-all duration-700 ease-out`}
          style={{
            opacity: cardGlowOpacity,
            filter: `blur(${cardGlowBlur}px)`,
          }}
        ></div>
        {children}
      </div>

      {footer && <div className="mt-8 text-center">{footer}</div>}

      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-full text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/5 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e] animate-pulse"></span>
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
            System Operational
          </span>
        </div>
      </div>
    </>
  )
}
