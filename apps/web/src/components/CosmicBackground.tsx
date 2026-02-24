import React, { useEffect, useState, useRef, useCallback } from 'react'

/**
 * CosmicBackground Component
 *
 * Precisely refactored to ensure correct layering.
 * Background color moved to a separate layer at z-[-4] to prevent
 * obscuring negative z-index children.
 *
 * Content auto-scales to fit the viewport regardless of zoom level,
 * matching the Dashboard's viewport-locked behaviour.
 */
interface CosmicBackgroundProps {
  children: React.ReactNode
  progress?: number
}

export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({ children, progress = 0 }) => {
  // Drive ring properties from progress (0 to 1)
  const ring1Speed = 60 - progress * 40 // 60s down to 20s
  const ring2Speed = 45 - progress * 30 // 45s down to 15s
  const ring1Opacity = 0.6 + progress * 0.3 // 0.6 up to 0.9
  const ring2Opacity = 0.7 + progress * 0.2 // 0.7 up to 0.9

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const computeScale = useCallback(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return

    // scrollHeight reports the unscaled natural height (CSS transforms
    // don't affect layout), so we can read it directly.
    const naturalHeight = content.scrollHeight
    const availableHeight = container.clientHeight
    const padding = 48 // breathing room

    if (naturalHeight + padding > availableHeight) {
      setScale(Math.max(0.4, (availableHeight - padding) / naturalHeight))
    } else {
      setScale(1)
    }
  }, [])

  useEffect(() => {
    computeScale()

    window.addEventListener('resize', computeScale)

    // visualViewport fires reliably on browser zoom changes
    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener('resize', computeScale)
    }

    return () => {
      window.removeEventListener('resize', computeScale)
      if (vv) {
        vv.removeEventListener('resize', computeScale)
      }
    }
  }, [computeScale])

  // Recompute when children change (e.g. toggling login ↔ signup)
  useEffect(() => {
    const timer = setTimeout(computeScale, 50)
    return () => clearTimeout(timer)
  }, [children, computeScale])

  return (
    <div
      ref={containerRef}
      className="font-body text-white/80 h-[100dvh] w-full overflow-hidden relative flex items-center justify-center"
    >
      {/* Background Color Layer (Bottom-most) */}
      <div className="fixed inset-0 z-[-4] bg-background-dark"></div>

      {/* Background Layers */}
      <div className="fixed inset-0 z-[-3] bg-cosmos opacity-40"></div>
      <div className="fixed inset-0 z-[-2] bg-gradient-to-b from-black/80 via-black/40 to-black/90"></div>
      <div className="fixed inset-0 z-[-1] planet-arc"></div>

      {/* Milkyway Radial Ring (Crescent Glow) */}
      <div className="fixed inset-0 z-[-1] crescent-glow animate-pulse-slow"></div>

      <div
        className="fixed inset-0 z-[-1] star-field animate-spin-slow"
        style={{ animationDuration: '200s' }}
      ></div>

      {/* Orbital Rings */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full animate-spin-slow pointer-events-none orbital-ring transition-all duration-1000"
        style={{
          animationDuration: `${ring1Speed}s`,
          opacity: ring1Opacity,
        }}
      ></div>
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full animate-spin-reverse-slow pointer-events-none orbital-ring transition-all duration-1000"
        style={{
          animationDuration: `${ring2Speed}s`,
          opacity: ring2Opacity,
        }}
      ></div>

      {/*
        Content Area — two wrappers:
        Outer div: handles viewport-fit scaling (no animation, so inline
                   transform isn't overridden)
        Inner div: handles the float animation + max-width
      */}
      <div
        ref={contentRef}
        className="relative z-10 w-full flex items-center justify-center"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.3s ease-out',
        }}
      >
        <div className="w-full max-w-[min(90vw,512px)] px-4 sm:px-6 animate-float">{children}</div>
      </div>
    </div>
  )
}
