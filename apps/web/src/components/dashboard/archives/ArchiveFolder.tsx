import React, { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { trpc } from '../../../lib/trpc'
import { DraggableSession } from './DraggableSession'

interface ArchiveFolderProps {
  folder: { id: string; name: string; sessionCount: number }
  isExpanded: boolean
  onToggle: () => void
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
}

export const ArchiveFolder: React.FC<ArchiveFolderProps> = ({
  folder,
  isExpanded,
  onToggle,
  activeSessionId,
  onSelectSession,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
    data: { folderId: folder.id },
  })

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(folder.name)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const utils = trpc.useUtils()

  const renameMutation = trpc.user.renameFolder.useMutation({
    onSuccess: () => {
      utils.user.getArchiveFolders.invalidate()
      setIsRenaming(false)
    },
  })

  const deleteMutation = trpc.user.deleteFolder.useMutation({
    onSuccess: () => {
      utils.user.getArchiveFolders.invalidate()
      utils.user.getChatHistory.invalidate()
      setShowDeleteConfirm(false)
    },
  })

  const unarchiveMutation = trpc.user.unarchiveSession.useMutation({
    onSuccess: () => {
      utils.user.getChatHistory.invalidate()
      utils.user.getArchiveFolders.invalidate()
      utils.user.getArchivedSessions.invalidate()
    },
  })

  const { data: sessions, isLoading: sessionsLoading } = trpc.user.getArchivedSessions.useQuery(
    { folderId: folder.id },
    { enabled: isExpanded }
  )

  const handleRenameSubmit = (e?: React.FormEvent | React.FocusEvent) => {
    e?.preventDefault()
    if (renameMutation.isPending) return
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== folder.name) {
      renameMutation.mutate({ folderId: folder.id, name: trimmed })
    } else {
      setIsRenaming(false)
      setRenameValue(folder.name)
    }
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setIsRenaming(false)
      setRenameValue(folder.name)
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border transition-all duration-200 ${
        isOver
          ? 'border-primary/50 bg-primary/5 shadow-[0_0_10px_rgba(0,242,255,0.2)]'
          : 'border-transparent'
      }`}
    >
      {/* Folder header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 group cursor-pointer">
        <button onClick={onToggle} className="flex items-center gap-1.5 flex-1 min-w-0">
          <span
            className="material-symbols-outlined text-[14px] text-primary/60 transition-transform duration-200"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            chevron_right
          </span>
          <span className="material-symbols-outlined text-[14px] text-primary/50">
            {isExpanded ? 'folder_open' : 'folder'}
          </span>
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              maxLength={50}
              className="text-[11px] text-white bg-white/5 border border-primary/30 rounded px-1 py-0.5 w-full focus:outline-none focus:border-primary/50"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="text-[11px] text-white/70 truncate group-hover:text-white transition-colors">
              {folder.name}
            </span>
          )}
        </button>

        <span className="text-[9px] text-white/30 font-mono shrink-0">{folder.sessionCount}</span>

        {/* Rename button */}
        <button
          onClick={e => {
            e.stopPropagation()
            setRenameValue(folder.name)
            setIsRenaming(true)
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-white/40 hover:text-primary transition-all"
          title="Rename folder"
        >
          <span className="material-symbols-outlined text-[12px]">edit</span>
        </button>

        {/* Delete button */}
        <button
          onClick={e => {
            e.stopPropagation()
            setShowDeleteConfirm(true)
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-white/40 hover:text-red-400 transition-all"
          title="Delete folder"
        >
          <span className="material-symbols-outlined text-[12px]">delete</span>
        </button>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="mx-2 mb-2 p-2 bg-red-500/5 border border-red-500/20 rounded text-[10px]">
          <p className="text-white/60 mb-2">Delete folder? Sessions will be unarchived.</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-0.5 text-white/50 hover:text-white transition-colors"
              disabled={deleteMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate({ folderId: folder.id })}
              disabled={deleteMutation.isPending}
              className="px-2 py-0.5 text-red-400 bg-red-500/10 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Expanded sessions */}
      {isExpanded && (
        <div className="pl-6 pr-2 pb-1.5 space-y-0.5">
          {sessionsLoading && (
            <div className="py-2">
              <div className="animate-pulse h-2.5 bg-white/5 rounded w-3/4" />
            </div>
          )}
          {!sessionsLoading && (!sessions || sessions.length === 0) && (
            <p className="text-[9px] text-white/25 font-mono py-1.5">No sessions</p>
          )}
          {sessions?.map(session => (
            <DraggableSession
              key={session.id}
              sessionId={session.id}
              sessionTitle={session.title}
              source="archive"
              sourceFolderId={folder.id}
            >
              <div
                onClick={() => onSelectSession(session.id)}
                className={`group/item cursor-pointer px-2 py-1.5 rounded transition-all duration-200 flex items-center justify-between gap-1 ${
                  session.id === activeSessionId
                    ? 'bg-primary/10 border border-primary/30'
                    : 'border border-transparent hover:bg-white/5 hover:border-white/10'
                }`}
              >
                <span
                  className={`text-[10px] truncate ${
                    session.id === activeSessionId
                      ? 'text-primary'
                      : 'text-white/60 group-hover/item:text-white/80'
                  }`}
                >
                  {session.title}
                </span>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    unarchiveMutation.mutate({ sessionId: session.id })
                  }}
                  className="opacity-0 group-hover/item:opacity-100 p-0.5 text-white/40 hover:text-primary transition-all shrink-0"
                  title="Unarchive"
                >
                  <span className="material-symbols-outlined text-[12px]">unarchive</span>
                </button>
              </div>
            </DraggableSession>
          ))}
        </div>
      )}
    </div>
  )
}
