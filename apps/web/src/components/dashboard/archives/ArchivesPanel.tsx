import React, { useState } from 'react'
import { trpc } from '../../../lib/trpc'
import { ArchiveFolder } from './ArchiveFolder'

interface ArchivesPanelProps {
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
}

export const ArchivesPanel: React.FC<ArchivesPanelProps> = ({
  activeSessionId,
  onSelectSession,
}) => {
  const { data: folders, isLoading } = trpc.user.getArchiveFolders.useQuery()
  const utils = trpc.useUtils()

  const createFolderMutation = trpc.user.createFolder.useMutation({
    onSuccess: () => {
      utils.user.getArchiveFolders.invalidate()
      setIsCreating(false)
      setNewFolderName('')
    },
  })

  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const handleCreateSubmit = (e?: React.FormEvent | React.FocusEvent) => {
    e?.preventDefault()
    if (createFolderMutation.isPending) return
    const trimmed = newFolderName.trim()
    if (trimmed) {
      createFolderMutation.mutate({ name: trimmed })
    } else {
      setIsCreating(false)
      setNewFolderName('')
    }
  }

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleCreateSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setIsCreating(false)
      setNewFolderName('')
    }
  }

  return (
    <div>
      <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 mb-4 flex items-center gap-2 border-b border-primary/20 pb-2">
        <span className="material-symbols-outlined text-sm">folder_open</span>
        <span className="flex-1">Archives</span>
        <button
          onClick={() => {
            setIsCreating(true)
            setNewFolderName('')
          }}
          className="text-primary/50 hover:text-primary transition-colors"
          title="Create folder"
        >
          <span className="material-symbols-outlined text-sm">create_new_folder</span>
        </button>
      </h3>

      {/* Create folder input */}
      {isCreating && (
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <span className="material-symbols-outlined text-[14px] text-primary/50">folder</span>
          <input
            autoFocus
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onBlur={handleCreateSubmit}
            onKeyDown={handleCreateKeyDown}
            placeholder="Folder name..."
            maxLength={50}
            className="text-[11px] text-white bg-white/5 border border-primary/30 rounded px-1.5 py-1 flex-1 focus:outline-none focus:border-primary/50 placeholder-white/25"
          />
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2 px-2">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse h-3 bg-white/5 rounded w-3/4" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!folders || folders.length === 0) && !isCreating && (
        <div className="text-center py-3">
          <span className="material-symbols-outlined text-lg text-white/15 block mb-1">
            folder_off
          </span>
          <p className="text-[9px] text-white/25 font-mono">No folders yet</p>
          <p className="text-[9px] text-white/15 font-mono mt-0.5">
            Create a folder to organize chats
          </p>
        </div>
      )}

      {/* Folder list */}
      <div className="space-y-0.5 max-h-[200px] overflow-y-auto chat-scroll">
        {folders?.map(folder => (
          <ArchiveFolder
            key={folder.id}
            folder={folder}
            isExpanded={expandedFolderId === folder.id}
            onToggle={() => setExpandedFolderId(prev => (prev === folder.id ? null : folder.id))}
            activeSessionId={activeSessionId}
            onSelectSession={onSelectSession}
          />
        ))}
      </div>
    </div>
  )
}
