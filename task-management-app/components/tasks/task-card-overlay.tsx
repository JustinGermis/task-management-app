'use client'

import { Calendar, MessageCircle, Users, AlertCircle, Clock, GripVertical, Edit2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TaskWithDetails, TaskPriority } from '@/lib/types'
import { formatDate, cn } from '@/lib/utils'
import { TASK_PRIORITIES } from '@/lib/constants'

interface TaskCardOverlayProps {
  task: TaskWithDetails
}

export function TaskCardOverlay({ task }: TaskCardOverlayProps) {
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
      className={cn(
        'transition-all hover:shadow-md group',
        'border-l-4',
        getPriorityColor(task.priority || 'medium'),
        'rotate-3 scale-105 shadow-lg opacity-80'
      )}
      style={{
        backgroundColor: task.color ? `${task.color}15` : undefined,
      }}
    >
      <CardContent className="p-3">
        <div className="flex gap-2">
          {/* Drag Handle */}
          <div className="cursor-grab active:cursor-grabbing touch-none mt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-3">
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
                <div className="flex -space-x-2">
                  {assignees.slice(0, 3).map((assignee) => (
                    <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={assignee.profiles?.avatar_url || ''} />
                      <AvatarFallback className="text-xs">
                        {assignee.profiles?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
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