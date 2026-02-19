import React from 'react'

interface AuthLayoutProps {
  title: React.ReactNode
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, footer }) => {
  return (
    <>
      <div className="text-center mb-10 relative">
        <div className="inline-flex items-center justify-center mb-4 relative">
          <span className="material-symbols-outlined text-5xl text-white font-thin relative z-10 drop-shadow-[0_0_15px_rgba(0,242,255,0.6)] text-primary">
            blur_on
          </span>
          <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full"></div>
        </div>
        <h1 className="font-display text-4xl tracking-[0.3em] font-light text-white drop-shadow-[0_0_10px_rgba(0,242,255,0.5)] uppercase">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.4em] text-white/40">
            {subtitle}
          </p>
        )}
      </div>

      {children}

      {footer && <div className="mt-8 text-center">{footer}</div>}

      <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-full text-center">
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
