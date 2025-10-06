'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, MessageCircle, Users, AlertCircle, Clock, GripVertical, Edit2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TaskWithDetails, TaskPriority } from '@/lib/types'
import { formatDate, cn } from '@/lib/utils'
import { TASK_PRIORITIES } from '@/lib/constants'

interface TaskCardProps {
  task: TaskWithDetails
  onClick: () => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getPriorityColor = (priority: TaskPriority) => {
    const config = TASK_PRIORITIES.find(p => p.id === priority)
    if (!config) return 'border-l-gray-500'
    return config.borderColor
  }

  const getPriorityIcon = (priority: TaskPriority) => {
    if (priority === 'critical') {
      return <AlertCircle className="h-3 w-3 text-red-600" />
    }
    return null
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  const assignees = task.assignees || []
  const commentsCount = task.comments?.length || 0

  return (
    <Card
      ref={setNodeRef}
      style={{
        ...style,
        background: task.color 
          ? `linear-gradient(135deg, ${task.color}08 0%, ${task.color}18 100%)`
          : undefined,
      }}
      {...attributes}
      className={cn(
        'transition-all hover:shadow-md group',
        'border-l-4',
        getPriorityColor(task.priority || 'medium')
      )}
    >
      <CardContent className="p-3">
        <div className="flex gap-2">
          {/* Drag Handle - NOT clickable */}
          <div 
            {...listeners}
            data-drag-handle
            className="cursor-grab active:cursor-grabbing touch-none mt-1 flex-shrink-0 p-1 rounded hover:bg-muted/50 transition-colors group/handle"
            onClick={(e) => e.stopPropagation()}
            title="Drag to move task"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground group-hover/handle:text-foreground transition-colors" />
          </div>

          {/* Main Content - Clickable */}
          <div 
            className="flex-1 cursor-pointer space-y-3"
            onClick={onClick}
          >
            {/* Title and Priority */}
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-sm line-clamp-2 flex-1">
                {task.title}
              </h4>
              <div className="flex items-center gap-1 ml-2">
                {getPriorityIcon(task.priority || 'medium')}
                <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.labels.slice(0, 2).map((labelInfo) => (
                  labelInfo.labels && (
                    <Badge 
                      key={labelInfo.labels.id} 
                      variant="secondary" 
                      className="text-xs"
                      style={{ backgroundColor: labelInfo.labels.color || undefined }}
                    >
                      {labelInfo.labels.name}
                    </Badge>
                  )
                ))}
                {task.labels.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{task.labels.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                {/* Due Date */}
                {task.due_date && (
                  <div className={cn(
                    "flex items-center space-x-1",
                    isOverdue && "text-red-600"
                  )}>
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(task.due_date)}</span>
                  </div>
                )}

                {/* Comments */}
                {commentsCount > 0 && (
                  <div className="flex items-center space-x-1 text-muted-foreground">
                    <MessageCircle className="h-3 w-3" />
                    <span>{commentsCount}</span>
                  </div>
                )}
              </div>

              {/* Assignees */}
              {assignees.length > 0 && (
                <div className="flex items-center -space-x-2">
                  {assignees.slice(0, 3).map((assignee) => {
                    // Check if this was an AI assignment
                    const isAutoAssigned = task.metadata?.autoAssigned && 
                                         task.metadata?.assignedEmail === assignee.profiles?.email
                    
                    return (
                      <div key={assignee.id} className="relative group/avatar">
                        <Avatar className={`h-6 w-6 border-2 border-background ${isAutoAssigned ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}>
                          <AvatarImage src={assignee.profiles?.avatar_url || ''} />
                          <AvatarFallback className={`text-xs ${isAutoAssigned ? 'bg-blue-100 text-blue-700' : ''}`}>
                            {assignee.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 
                             assignee.profiles?.email?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        {isAutoAssigned && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-background" title="Auto-assigned by AI" />
                        )}
                      </div>
                    )
                  })}
                  {assignees.length > 3 && (
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="text-xs">
                        +{assignees.length - 3}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}