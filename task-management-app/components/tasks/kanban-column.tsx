'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Badge } from '@/components/ui/badge'
import { TaskCard } from './task-card'
import { TaskWithDetails, TaskStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  id: TaskStatus
  title: string
  color: string
  tasks: TaskWithDetails[]
  onTaskClick: (task: TaskWithDetails) => void
}

export function KanbanColumn({ id, title, color, tasks, onTaskClick }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  })

  return (
    <div className="flex flex-col space-y-3">
      {/* Column Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={cn('w-3 h-3 rounded-full', color)} />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[400px] p-2 rounded-lg border-2 border-dashed transition-colors',
          isOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        )}
      >
        <SortableContext 
          items={tasks.map(task => task.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onClick={() => onTaskClick(task)}
              />
            ))}
            
            {tasks.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p className="text-sm">No tasks {title.toLowerCase().startsWith('in ') ? title.toLowerCase() : `in ${title.toLowerCase()}`}</p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}