import React, { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { trpc } from '../../../lib/trpc'

export interface DragData {
  sessionId: string
  sessionTitle: string
  source: 'history' | 'archive'
  sourceFolderId?: string
}

interface DndProviderProps {
  children: React.ReactNode
}

export const DndProvider: React.FC<DndProviderProps> = ({ children }) => {
  const [activeData, setActiveData] = useState<DragData | null>(null)
  const utils = trpc.useUtils()

  const archiveMutation = trpc.user.archiveSession.useMutation({
    onSuccess: () => {
      utils.user.getChatHistory.invalidate()
      utils.user.getArchiveFolders.invalidate()
      utils.user.getArchivedSessions.invalidate()
    },
  })

  const unarchiveMutation = trpc.user.unarchiveSession.useMutation({
    onSuccess: () => {
      utils.user.getChatHistory.invalidate()
      utils.user.getArchiveFolders.invalidate()
      utils.user.getArchivedSessions.invalidate()
    },
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined
    if (data) setActiveData(data)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveData(null)
      const { active, over } = event
      if (!over) return

      const data = active.data.current as DragData | undefined
      if (!data) return

      const overId = over.id as string

      // Dropped on a folder
      if (overId.startsWith('folder-')) {
        const folderId = overId.replace('folder-', '')
        // Don't archive if already in the same folder
        if (data.source === 'archive' && data.sourceFolderId === folderId) return
        archiveMutation.mutate({ sessionId: data.sessionId, folderId })
        return
      }

      // Dropped on chat history (unarchive)
      if (overId === 'chat-history-drop' && data.source === 'archive') {
        unarchiveMutation.mutate({ sessionId: data.sessionId })
      }
    },
    [archiveMutation, unarchiveMutation]
  )

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      {createPortal(
        <DragOverlay dropAnimation={null}>
          {activeData ? (
            <div className="px-3 py-2 text-xs text-primary font-medium bg-[rgba(0,242,255,0.08)] border border-primary/40 rounded-lg shadow-[0_0_20px_rgba(0,242,255,0.15)] backdrop-blur-md max-w-[180px] truncate pointer-events-none">
              {activeData.sessionTitle}
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  )
}
