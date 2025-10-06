'use client'

import { useState, useCallback, useEffect } from 'react'
import { Calendar, MessageCircle, Users, Trash2, Edit, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TaskWithDetails, TaskStatus, TaskPriority } from '@/lib/types'
import { updateTask, deleteTask, createComment } from '@/lib/api/simple-api'
import { useCommentUpdates } from '@/lib/hooks/use-realtime'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'

interface TaskDetailsDialogProps {
  task: TaskWithDetails | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTaskUpdated: (task: TaskWithDetails) => void
  onTaskDeleted: (taskId: string) => void
}

export function TaskDetailsDialog({ 
  task, 
  isOpen, 
  onOpenChange, 
  onTaskUpdated,
  onTaskDeleted 
}: TaskDetailsDialogProps) {
  // Debug logging to see what task data we receive
  useEffect(() => {
    if (task) {
      console.log('TaskDetailsDialog received task:', {
        id: task.id,
        title: task.title,
        metadata: task.metadata,
        assignees: task.assignees,
        assigneeCount: task.assignees?.length || 0
      })
      if (task.assignees && task.assignees.length > 0) {
        console.log('Assignee details:', task.assignees)
      }
    }
  }, [task])
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    due_date: '',
  })
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [realtimeComments, setRealtimeComments] = useState<any[]>([])

  // Set up real-time comment updates
  const handleCommentChange = useCallback((type: 'INSERT' | 'UPDATE' | 'DELETE', commentData: any) => {
    setRealtimeComments(prev => {
      switch (type) {
        case 'INSERT':
          // Don't add if comment already exists (avoid duplicates)
          if (prev.some(c => c.id === commentData.id)) return prev
          return [...prev, commentData]
        case 'UPDATE':
          return prev.map(c => c.id === commentData.id ? { ...c, ...commentData } : c)
        case 'DELETE':
          return prev.filter(c => c.id !== commentData.id)
        default:
          return prev
      }
    })
  }, [])

  useCommentUpdates(task?.id || '', handleCommentChange)

  // Reset realtime comments when task changes
  useEffect(() => {
    setRealtimeComments([])
  }, [task?.id])

  if (!task) return null

  const handleEdit = () => {
    setEditData({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const updatedTask = await updateTask(task.id, editData)
      onTaskUpdated({ ...task, ...updatedTask })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update task:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setIsLoading(true)
    try {
      const updatedTask = await updateTask(task.id, { status: newStatus })
      onTaskUpdated({ ...task, ...updatedTask })
    } catch (error) {
      console.error('Failed to update task status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    setIsLoading(true)
    try {
      await deleteTask(task.id)
      onTaskDeleted(task.id)
    } catch (error) {
      console.error('Failed to delete task:', error)
      setIsLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!comment.trim()) return
    
    setIsAddingComment(true)
    try {
      const newComment = await createComment(task.id, comment)
      const updatedTask = {
        ...task,
        comments: [...(task.comments || []), newComment]
      }
      onTaskUpdated(updatedTask)
      setComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsAddingComment(false)
    }
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'done': return 'bg-green-500'
      case 'in_progress': return 'bg-blue-500'
      case 'review': return 'bg-purple-500'
      case 'blocked': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  const assignees = task.assignees || []
  const comments = [...(task.comments || []), ...realtimeComments].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  className="text-lg font-semibold bg-transparent border-b-2 border-primary focus:outline-none w-full"
                />
              ) : (
                <DialogTitle className="text-lg">{task.title}</DialogTitle>
              )}
              
              {/* Project Info */}
              {task.project && (
                <div className="flex items-center space-x-2 mt-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: task.project.color || '#6b7280' }}
                  />
                  <span className="text-sm text-muted-foreground">{task.project.name}</span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={isLoading}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={handleEdit}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center space-x-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select 
                value={task.status || 'todo'} 
                onValueChange={handleStatusChange}
                disabled={isLoading}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              {isEditing ? (
                <Select 
                  value={editData.priority} 
                  onValueChange={(value: TaskPriority) => setEditData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className={getPriorityColor(task.priority || 'medium')}>
                  {task.priority === 'critical' && <AlertCircle className="mr-1 h-3 w-3" />}
                  {task.priority || 'medium'}
                </Badge>
              )}
            </div>

            {/* Progress */}
            {task.progress !== null && task.progress > 0 && (
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Progress</label>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{task.progress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">Description</label>
            {isEditing ? (
              <Textarea
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add a description..."
                rows={4}
                className="mt-2"
              />
            ) : (
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {task.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* Dates and Assignees */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium">Due Date</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editData.due_date}
                  onChange={(e) => setEditData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="mt-2 w-full px-3 py-2 border rounded-md text-sm"
                />
              ) : (
                <div className={cn(
                  'mt-2 flex items-center space-x-2 text-sm',
                  isOverdue ? 'text-red-600' : 'text-muted-foreground'
                )}>
                  <Calendar className="h-4 w-4" />
                  <span>
                    {task.due_date ? formatDate(task.due_date) : 'No due date'}
                  </span>
                  {isOverdue && <span className="text-red-600 font-medium">(Overdue)</span>}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Assignees</label>
              <div className="mt-2 flex items-center space-x-2">
                {assignees.length > 0 ? (
                  <div className="flex -space-x-2">
                    {assignees.map((assignee) => {
                      const profile = assignee.profiles
                      if (!profile) return null

                      const initials = profile.full_name
                        ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                        : profile.email.charAt(0).toUpperCase()

                      return (
                        <Avatar key={assignee.id} className="h-8 w-8 border-2 border-background">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                      )
                    })}
                  </div>
                ) : task.metadata?.assignedTo ? (
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarFallback>
                        {(task.metadata.assignedTo as string).split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{task.metadata.assignedTo as string}</div>
                      <div className="text-xs text-muted-foreground">
                        {task.metadata.assignedEmail as string}
                      </div>
                      {task.metadata.autoAssigned && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Auto-assigned
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No assignees</span>
                )}
              </div>
            </div>
          </div>

          {/* Created Info */}
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>
                Created {formatRelativeTime(task.created_at!)}
                {task.created_by_profile && (
                  <span> by {task.created_by_profile.full_name || task.created_by_profile.email}</span>
                )}
              </span>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Comments ({comments.length})</h3>
            </div>

            {/* Add Comment */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <Button 
                size="sm" 
                onClick={handleAddComment}
                disabled={!comment.trim() || isAddingComment}
              >
                {isAddingComment ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.map((comment) => {
                const profile = comment.profiles
                if (!profile) return null

                const initials = profile.full_name
                  ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                  : profile.email.charAt(0).toUpperCase()

                return (
                  <div key={comment.id} className="flex space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {profile.full_name || profile.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(comment.created_at!)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                )
              })}
              
              {comments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">No comments yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}