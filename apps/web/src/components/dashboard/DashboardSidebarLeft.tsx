import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useDroppable } from '@dnd-kit/core'
import { trpc } from '../../lib/trpc'
import { useAuth } from '../../hooks/useAuth'
import { DndProvider } from './archives/DndProvider'
import { DraggableSession } from './archives/DraggableSession'
import { ArchivesPanel } from './archives/ArchivesPanel'

// ── Props ─────────────────────────────────────────────────────────────

interface DashboardSidebarLeftProps {
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onNewChat: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Group chat sessions into "Today", "Yesterday", and "Earlier". */
function groupByDate(sessions: { id: string; title: string; updatedAt: string }[]) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000)

  const groups: { label: string; items: typeof sessions }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier', items: [] },
  ]

  for (const s of sessions) {
    const d = new Date(s.updatedAt)
    if (d >= todayStart) groups[0].items.push(s)
    else if (d >= yesterdayStart) groups[1].items.push(s)
    else groups[2].items.push(s)
  }

  return groups.filter(g => g.items.length > 0)
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ── Admin: Ingestion Panel ─────────────────────────────────────────────

const AdminIngestPanel: React.FC = () => {
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
  )
}

// ── User: Chat History Panel ───────────────────────────────────────────

interface ChatHistoryPanelProps {
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onNewChat: () => void
}

const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  activeSessionId,
  onSelectSession,
  onNewChat,
}) => {
  const { data: sessions, isLoading } = trpc.user.getChatHistory.useQuery()
  const deleteSessionMutation = trpc.user.deleteSession.useMutation()
  const utils = trpc.useUtils()

  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)

  const confirmDelete = async () => {
    if (!sessionToDelete) return
    const id = sessionToDelete
    await deleteSessionMutation.mutateAsync({ sessionId: id })
    utils.user.getChatHistory.invalidate()
    if (activeSessionId === id) {
      onNewChat()
    }
    setSessionToDelete(null)
  }

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    setSessionToDelete(sessionId)
  }

  const grouped = sessions ? groupByDate(sessions) : []

  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: 'chat-history-drop',
  })

  return (
    <div
      ref={setDropRef}
      className={`rounded-lg transition-all duration-200 ${
        isDropOver
          ? 'bg-primary/5 ring-1 ring-primary/30 shadow-[0_0_12px_rgba(0,242,255,0.15)]'
          : ''
      }`}
    >
      <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 mb-4 flex items-center gap-2 border-b border-primary/20 pb-2">
        <span className="material-symbols-outlined text-sm">forum</span>
        Chat history
      </h3>

      {/* New Chat button */}
      <button
        className="w-full mb-4 py-2 px-3 text-[10px] font-mono uppercase tracking-wider bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
        onClick={onNewChat}
      >
        <span className="material-symbols-outlined text-sm group-hover:rotate-90 transition-transform duration-300">
          add
        </span>
        New Chat
      </button>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-white/5 rounded w-3/4 mb-1" />
              <div className="h-2 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && grouped.length === 0 && (
        <div className="text-center py-6">
          <span className="material-symbols-outlined text-2xl text-white/20 mb-2 block">
            chat_bubble_outline
          </span>
          <p className="text-[10px] text-white/30 font-mono">No sessions yet</p>
          <p className="text-[9px] text-white/20 font-mono mt-1">
            Start a conversation to see your history
          </p>
        </div>
      )}

      {/* Grouped sessions */}
      <div className="space-y-4 max-h-[240px] overflow-y-auto chat-scroll pr-1">
        {grouped.map(group => (
          <div key={group.label}>
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30 mb-2 px-1">
              {group.label}
            </div>
            <ul className="space-y-1">
              {group.items.map(session => {
                const isActive = session.id === activeSessionId
                return (
                  <DraggableSession
                    key={session.id}
                    sessionId={session.id}
                    sessionTitle={session.title}
                    source="history"
                  >
                    <li
                      onClick={() => onSelectSession(session.id)}
                      className={`group cursor-pointer p-2 rounded-lg transition-all duration-300 border flex items-center justify-between gap-2 ${
                        isActive
                          ? 'bg-primary/10 border-primary/30'
                          : 'border-transparent hover:bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-medium transition-colors truncate ${
                            isActive ? 'text-primary' : 'text-white/80 group-hover:text-primary'
                          }`}
                        >
                          {session.title}
                        </div>
                        <div className="text-[9px] text-white/30 mt-0.5 font-mono">
                          {relativeTime(session.updatedAt)}
                        </div>
                      </div>
                      <button
                        onClick={e => handleDeleteClick(e, session.id)}
                        disabled={deleteSessionMutation.isPending}
                        className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-colors rounded disabled:opacity-50"
                        title="Delete chat"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </li>
                  </DraggableSession>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {sessionToDelete &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background-dark border border-white/10 rounded-xl p-6 max-w-sm w-full shadow-2xl overflow-hidden">
              <h4 className="text-white text-sm font-medium mb-2">Delete Chat History</h4>
              <p className="text-white/60 text-xs mb-6">
                Are you sure you want to delete this conversation? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="px-4 py-2 text-xs font-mono text-white/70 hover:text-white transition-colors"
                  disabled={deleteSessionMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteSessionMutation.isPending}
                  className="px-4 py-2 text-xs font-mono bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  {deleteSessionMutation.isPending ? (
                    <span className="material-symbols-outlined text-sm animate-spin">
                      progress_activity
                    </span>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

// ── Main Sidebar Component ─────────────────────────────────────────────

export const DashboardSidebarLeft: React.FC<DashboardSidebarLeftProps> = ({
  activeSessionId,
  onSelectSession,
  onNewChat,
}) => {
  const { role } = useAuth()

  return (
    <aside className="hidden lg:flex w-[220px] shrink-0 h-full glass-panel rounded-xl flex-col justify-between py-6 px-4 relative overflow-hidden shadow-panel-glow">
      <DndProvider>
        <div className="space-y-8">
          {/* Role-based primary section */}
          {role === 'admin' ? (
            <AdminIngestPanel />
          ) : (
            <ChatHistoryPanel
              activeSessionId={activeSessionId}
              onSelectSession={onSelectSession}
              onNewChat={onNewChat}
            />
          )}

          <ArchivesPanel activeSessionId={activeSessionId} onSelectSession={onSelectSession} />
        </div>
      </DndProvider>
    </aside>
  )
}
