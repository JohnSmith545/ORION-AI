import React, { useState } from 'react'
import { trpc } from '../../lib/trpc'

export const DashboardSidebarLeft: React.FC = () => {
  const [ingestUri, setIngestUri] = useState('')
  const [ingestTitle, setIngestTitle] = useState('')
  const [ingestType, setIngestType] = useState<'api' | 'gcs'>('api')
  const ingestMutation = trpc.rag.ingest.useMutation()

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault()
    const uri = ingestUri.trim()
    if (!uri) return
    try {
      await ingestMutation.mutateAsync({
        sourceUri: uri,
        sourceType: ingestType,
        title: ingestTitle.trim() || undefined,
      })
      setIngestUri('')
      setIngestTitle('')
    } catch {
      // Error surfaced via mutation state / toast could be added
    }
  }

  return (
    <aside className="glass-panel rounded-xl flex flex-col justify-between py-6 px-4 relative overflow-hidden shadow-panel-glow">
      <div className="space-y-8">
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 mb-4 flex items-center gap-2 border-b border-primary/20 pb-2">
            <span className="material-symbols-outlined text-sm">upload_file</span>
            Ingest data
          </h3>
          <form onSubmit={handleIngest} className="space-y-2">
            <input
              type="text"
              value={ingestUri}
              onChange={e => setIngestUri(e.target.value)}
              placeholder={ingestType === 'gcs' ? 'gs://bucket/path' : 'https://...'}
              className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded text-white placeholder-white/30 focus:border-primary/40 focus:outline-none"
              aria-label="Source URI"
            />
            <input
              type="text"
              value={ingestTitle}
              onChange={e => setIngestTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded text-white placeholder-white/30 focus:border-primary/40 focus:outline-none"
              aria-label="Document title"
            />
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 text-[10px] text-white/60 cursor-pointer">
                <input
                  type="radio"
                  name="sourceType"
                  checked={ingestType === 'api'}
                  onChange={() => setIngestType('api')}
                  className="rounded border-white/20 bg-white/5 text-primary"
                />
                API
              </label>
              <label className="flex items-center gap-1.5 text-[10px] text-white/60 cursor-pointer">
                <input
                  type="radio"
                  name="sourceType"
                  checked={ingestType === 'gcs'}
                  onChange={() => setIngestType('gcs')}
                  className="rounded border-white/20 bg-white/5 text-primary"
                />
                GCS
              </label>
            </div>
            <button
              type="submit"
              disabled={ingestMutation.isPending}
              className="w-full py-1.5 text-[10px] font-mono uppercase tracking-wider bg-primary/20 border border-primary/40 text-primary rounded hover:bg-primary/30 disabled:opacity-50"
            >
              {ingestMutation.isPending ? 'Ingesting…' : 'Ingest'}
            </button>
            {ingestMutation.isSuccess && (
              <p className="text-[9px] text-primary/80 font-mono">
                Saved: {ingestMutation.data?.docId}
              </p>
            )}
            {ingestMutation.isError && (
              <p className="text-[9px] text-red-400/90 font-mono">{ingestMutation.error.message}</p>
            )}
          </form>
        </div>
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 mb-4 flex items-center gap-2 border-b border-primary/20 pb-2">
            <span className="material-symbols-outlined text-sm">history</span>
            Mission Feed
          </h3>
          <ul className="space-y-4">
            <li className="group cursor-pointer p-2 rounded hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10">
              <div className="text-xs text-white/90 font-medium group-hover:text-primary transition-colors">
                Kepler Trajectory
              </div>
              <div className="text-[9px] text-white/40 mt-0.5">T-minus 4h 20m</div>
            </li>
            <li className="group cursor-pointer p-2 rounded hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10">
              <div className="text-xs text-white/90 font-medium group-hover:text-primary transition-colors">
                Nebula Analysis
              </div>
              <div className="text-[9px] text-white/40 mt-0.5">Complete</div>
            </li>
            <li className="group cursor-pointer p-2 rounded hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10">
              <div className="text-xs text-white/90 font-medium group-hover:text-primary transition-colors">
                Star Chart Delta
              </div>
              <div className="text-[9px] text-primary/60 mt-0.5 animate-pulse">Processing...</div>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50 mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
            <span className="material-symbols-outlined text-sm">folder_open</span>
            Archives
          </h3>
          <ul className="space-y-2 opacity-80">
            <li className="text-xs text-white/60 font-light hover:text-white cursor-pointer px-2 py-1.5 rounded hover:bg-white/5 transition-colors">
              Sector 7 Logs
            </li>
            <li className="text-xs text-white/60 font-light hover:text-white cursor-pointer px-2 py-1.5 rounded hover:bg-white/5 transition-colors">
              Void Signals
            </li>
          </ul>
        </div>
      </div>
      <div className="opacity-60 mt-4">
        <div className="w-full h-24 border border-white/10 relative overflow-hidden bg-black/20 rounded-md">
          <div
            className="absolute top-0 left-0 w-full h-[1px] bg-primary/50 animate-float"
            style={{ animationDuration: '3s' }}
          />
          <div className="absolute bottom-2 left-2 text-[8px] font-mono text-primary/70">
            SIGNAL_STRENGTH
          </div>
          <div className="flex items-end justify-between px-2 pb-4 h-full gap-1">
            <div className="w-1 bg-primary/30 h-1/2" />
            <div className="w-1 bg-primary/40 h-3/4" />
            <div className="w-1 bg-primary/20 h-1/3" />
            <div className="w-1 bg-primary/60 h-full shadow-[0_0_5px_rgba(0,242,255,0.4)]" />
            <div className="w-1 bg-primary/40 h-2/3" />
            <div className="w-1 bg-primary/20 h-1/4" />
          </div>
        </div>
      </div>
    </aside>
  )
}
