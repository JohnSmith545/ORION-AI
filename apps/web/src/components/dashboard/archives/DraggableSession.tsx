import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { DragData } from './DndProvider'

interface DraggableSessionProps {
  sessionId: string
  sessionTitle: string
  source: 'history' | 'archive'
  sourceFolderId?: string
  children: React.ReactNode
}

export const DraggableSession: React.FC<DraggableSessionProps> = ({
  sessionId,
  sessionTitle,
  source,
  sourceFolderId,
  children,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `session-${sessionId}`,
    data: {
      sessionId,
      sessionTitle,
      source,
      sourceFolderId,
    } satisfies DragData,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className="touch-none"
    >
      {children}
    </div>
  )
}
