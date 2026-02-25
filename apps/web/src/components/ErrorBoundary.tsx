import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 text-center">
          <span className="material-symbols-outlined text-red-500 text-6xl mb-4 animate-pulse">
            warning
          </span>
          <h1 className="text-3xl font-display font-light text-white tracking-widest mb-2">
            CRITICAL ANOMALY
          </h1>
          <p className="text-white/50 font-mono text-sm max-w-md mb-6">
            The Celestial Network encountered a fatal synchronization error.
          </p>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-2 border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-mono text-xs uppercase tracking-widest rounded"
          >
            Re-establish Link
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
