'use client'

import { useState, useCallback, useEffect } from 'react'
import { Calendar, MessageCircle, Users, Trash2, Clock, AlertCircle, X, Plus, Tag, Folder, Palette, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DateInput } from '@/components/ui/date-input'
import { TaskWithDetails } from '@/lib/types'
import { TASK_STATUSES, TASK_PRIORITIES, DEFAULT_LABELS, TASK_COLORS } from '@/lib/constants'
import { 
  updateTask, 
  deleteTask, 
  createComment,
  getTaskAssignees,
  addTaskAssignee,
  removeTaskAssignee,
  getTaskLabels,
  getProjectLabels,
  createLabel,
  addTaskLabel,
  removeTaskLabel,
  getAvailableAssignees,
  getTask,
  getProjects,
  cloneTask
} from '@/lib/api/simple-api'
import { useCommentUpdates } from '@/lib/hooks/use-realtime'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'

interface TaskDetailsEnhancedProps {
  task: TaskWithDetails | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTaskUpdated: (task: TaskWithDetails) => void
  onTaskDeleted: (taskId: string) => void
  onTaskCloned?: (task: TaskWithDetails) => void
}

export function TaskDetailsEnhanced({ 
  task, 
  isOpen, 
  onOpenChange, 
  onTaskUpdated,
  onTaskDeleted,
  onTaskCloned
}: TaskDetailsEnhancedProps) {
  const [currentTask, setCurrentTask] = useState<TaskWithDetails | null>(task)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [taskColor, setTaskColor] = useState('')
  
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [isCloning, setIsCloning] = useState(false)
  const [realtimeComments, setRealtimeComments] = useState<any[]>([])
  
  // Assignee management
  const [assignees, setAssignees] = useState<any[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false)
  
  // Label management
  const [labels, setLabels] = useState<any[]>([])
  const [projectLabels, setProjectLabels] = useState<any[]>([])
  const [isLabelPopoverOpen, setIsLabelPopoverOpen] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6')
  const [isCreatingLabel, setIsCreatingLabel] = useState(false)
  
  // Project management
  const [availableProjects, setAvailableProjects] = useState<any[]>([])

  // Load initial data when task changes
  useEffect(() => {
    if (task) {
      setCurrentTask(task)
      setTitle(task.title)
      setDescription(task.description || '')
      setPriority(task.priority || 'medium')
      setStatus(task.status || 'todo')
      setStartDate(task.start_date ? task.start_date.split('T')[0] : '')
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '')
      setProjectId(task.project_id)
      setTaskColor(task.color || '#6b7280')
      
      loadTaskDetails()
      loadAvailableProjects()
    }
  }, [task])

  const loadTaskDetails = async () => {
    if (!task) return
    
    try {
      // Load assignees
      const taskAssignees = await getTaskAssignees(task.id)
      setAssignees(taskAssignees)
      
      // Load available users
      const users = await getAvailableAssignees(task.project_id)
      setAvailableUsers(users)
      
      // Load labels
      const taskLabels = await getTaskLabels(task.id)
      setLabels(taskLabels)
      
      // Load project labels
      const projLabels = await getProjectLabels(task.project_id)
      setProjectLabels(projLabels)
    } catch (error) {
      console.error('Failed to load task details:', error)
    }
  }

  const loadAvailableProjects = async () => {
    try {
      const projects = await getProjects()
      setAvailableProjects(projects)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  // Real-time comment updates
  const handleCommentChange = useCallback((type: 'INSERT' | 'UPDATE' | 'DELETE', commentData: any) => {
    setRealtimeComments(prev => {
      switch (type) {
        case 'INSERT':
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

  if (!task || !currentTask) return null

  const handleSave = async () => {
    console.log('[TaskDetailsEnhanced] handleSave called, task:', task.id.slice(0, 8), 'old status:', task.status, 'new status:', status)
    setIsLoading(true)
    try {
      const updates: any = {
        title,
        description,
        priority,
        status,
        start_date: startDate || null,
        due_date: dueDate || null,
        color: taskColor,
      }

      // Only update project if it changed
      if (projectId !== task.project_id) {
        updates.project_id = projectId
      }

      console.log('[TaskDetailsEnhanced] Calling updateTask with:', updates)
      const updatedTask = await updateTask(task.id, updates)
      console.log('[TaskDetailsEnhanced] updateTask returned:', updatedTask)

      console.log('[TaskDetailsEnhanced] Fetching full task with getTask')
      const fullTask = await getTask(task.id)
      console.log('[TaskDetailsEnhanced] getTask returned task with status:', fullTask?.status)

      if (fullTask) {
        setCurrentTask(fullTask)
        console.log('[TaskDetailsEnhanced] Calling onTaskUpdated with task:', fullTask.id.slice(0, 8), 'status:', fullTask.status)
        onTaskUpdated(fullTask)
      }
    } catch (error) {
      console.error('Failed to update task:', error)
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

  const handleClone = async () => {
    if (!currentTask) return
    
    setIsCloning(true)
    try {
      const clonedTask = await cloneTask(currentTask.id)
      
      // Create a full task object for the UI (similar to createTask flow)
      const fullClonedTask: TaskWithDetails = {
        ...clonedTask,
        assignees: [],
        comments: [],
        labels: [],
        project: currentTask.project,
      }
      
      if (onTaskCloned) {
        onTaskCloned(fullClonedTask)
      }
      
      // Close the current dialog
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to clone task:', error)
    } finally {
      setIsCloning(false)
    }
  }

  const handleAddComment = async () => {
    if (!comment.trim()) return
    
    setIsAddingComment(true)
    try {
      const newComment = await createComment(task.id, comment)
      setComment('')
      // Comments will update via realtime subscription
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsAddingComment(false)
    }
  }

  // Assignee management
  const handleAddAssignee = async (userId: string) => {
    try {
      await addTaskAssignee(task.id, userId)
      const newAssignees = await getTaskAssignees(task.id)
      setAssignees(newAssignees)
      setIsAssigneePopoverOpen(false)
    } catch (error) {
      console.error('Failed to add assignee:', error)
    }
  }

  const handleRemoveAssignee = async (userId: string) => {
    try {
      await removeTaskAssignee(task.id, userId)
      setAssignees(prev => prev.filter(a => a.user_id !== userId))
    } catch (error) {
      console.error('Failed to remove assignee:', error)
    }
  }

  // Label management
  const handleAddLabel = async (labelId: string) => {
    try {
      await addTaskLabel(task.id, labelId)
      const newLabels = await getTaskLabels(task.id)
      setLabels(newLabels)
    } catch (error) {
      console.error('Failed to add label:', error)
    }
  }

  const handleRemoveLabel = async (labelId: string) => {
    try {
      await removeTaskLabel(task.id, labelId)
      setLabels(prev => prev.filter(l => l.label_id !== labelId))
    } catch (error) {
      console.error('Failed to remove label:', error)
    }
  }

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return
    
    setIsCreatingLabel(true)
    try {
      const newLabel = await createLabel(task.project_id, newLabelName, newLabelColor)
      setProjectLabels(prev => [...prev, newLabel])
      await handleAddLabel(newLabel.id)
      setNewLabelName('')
      setNewLabelColor('#3b82f6')
    } catch (error) {
      console.error('Failed to create label:', error)
    } finally {
      setIsCreatingLabel(false)
    }
  }

  const getPriorityConfig = (priorityId: string) => {
    return TASK_PRIORITIES.find(p => p.id === priorityId) || TASK_PRIORITIES[1]
  }

  const getStatusConfig = (statusId: string) => {
    return TASK_STATUSES.find(s => s.id === statusId) || TASK_STATUSES[0]
  }

  const isOverdue = dueDate && new Date(dueDate) < new Date()
  const assignedUserIds = assignees.map(a => a.user_id)
  const assignedLabelIds = labels.map(l => l.label_id)
  const availableUsersToAdd = availableUsers.filter(u => !assignedUserIds.includes(u.id))
  const availableLabelsToAdd = projectLabels.filter(l => !assignedLabelIds.includes(l.id))
  
  const comments = [...(currentTask.comments || []), ...realtimeComments].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const hasChanges =
    title !== task.title ||
    description !== (task.description || '') ||
    priority !== (task.priority || 'medium') ||
    status !== (task.status || 'todo') ||
    startDate !== (task.start_date ? task.start_date.split('T')[0] : '') ||
    dueDate !== (task.due_date ? task.due_date.split('T')[0] : '') ||
    projectId !== task.project_id ||
    taskColor !== (task.color || '#6b7280')

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{title || 'Task Details'}</DialogTitle>
          <div className="space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold border-0 px-0 focus-visible:ring-0"
              placeholder="Task title..."
            />

            {/* Project Selector */}
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-fit border-0 h-auto p-0 focus:ring-0">
                <div className="flex items-center space-x-2">
                  <Folder className="h-3 w-3 text-muted-foreground" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {availableProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status, Priority, Dates Row */}
          <div className="flex flex-wrap gap-3">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center space-x-2">
                      <div className={cn('w-2 h-2 rounded-full', s.color)} />
                      <span>{s.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className={p.color}>{p.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DateInput
              value={startDate}
              onChange={setStartDate}
              placeholder="Start date"
            />

            <DateInput
              value={dueDate}
              onChange={setDueDate}
              placeholder="Due date"
              className={isOverdue ? "text-red-600 border-red-200" : ""}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Card Color</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TASK_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setTaskColor(color.value)}
                  className={cn(
                    "w-8 h-8 rounded-md border-2 transition-all",
                    taskColor === color.value ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Assignees</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {assignees.map((assignee) => {
                const profile = assignee.profiles
                if (!profile) return null

                return (
                  <Badge key={assignee.user_id} variant="secondary" className="pr-1" title={profile.email}>
                    <Avatar className="h-5 w-5 mr-1">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {profile.full_name?.charAt(0) || profile.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {profile.full_name || profile.email}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                      onClick={() => handleRemoveAssignee(assignee.user_id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}
              
              <Popover open={isAssigneePopoverOpen} onOpenChange={setIsAssigneePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7">
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="space-y-1">
                    {availableUsersToAdd.map((user) => (
                      <Button
                        key={user.id}
                        variant="ghost"
                        className="w-full justify-start h-auto py-2"
                        onClick={() => handleAddAssignee(user.id)}
                      >
                        <Avatar className="h-5 w-5 mr-2 flex-shrink-0">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.full_name?.charAt(0) || user.email.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start text-left">
                          <div className="text-sm">{user.full_name || user.email}</div>
                          {user.full_name && (
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          )}
                        </div>
                      </Button>
                    ))}
                    {availableUsersToAdd.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        All team members assigned
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <span>Labels</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {labels.map((taskLabel) => {
                const label = taskLabel.labels
                if (!label) return null
                
                return (
                  <Badge 
                    key={taskLabel.label_id} 
                    variant="secondary"
                    style={{ backgroundColor: label.color }}
                    className="pr-1"
                  >
                    {label.name}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                      onClick={() => handleRemoveLabel(taskLabel.label_id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}
              
              <Popover open={isLabelPopoverOpen} onOpenChange={setIsLabelPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7">
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="space-y-2">
                    {availableLabelsToAdd.map((label) => (
                      <Button
                        key={label.id}
                        variant="ghost"
                        className="w-full justify-start h-8"
                        onClick={() => handleAddLabel(label.id)}
                      >
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                      </Button>
                    ))}
                    
                    <div className="border-t pt-2 space-y-2">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="New label..."
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          className="h-8"
                        />
                        <Input
                          type="color"
                          value={newLabelColor}
                          onChange={(e) => setNewLabelColor(e.target.value)}
                          className="h-8 w-12 p-1"
                        />
                        <Button
                          size="sm"
                          onClick={handleCreateLabel}
                          disabled={!newLabelName.trim() || isCreatingLabel}
                          className="h-8"
                        >
                          Create
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={4}
            />
          </div>


          {/* Comments */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-medium flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Comments ({comments.length})</span>
            </h3>

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

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.map((comment) => {
                const profile = comment.profiles || comment.user
                if (!profile) return null

                return (
                  <div key={comment.id} className="flex space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {profile.full_name?.charAt(0) || profile.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {profile.full_name || profile.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
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

          {/* Metadata */}
          <div className="text-xs text-muted-foreground border-t pt-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3" />
              <span>
                Created {formatRelativeTime(currentTask.created_at!)}
                {currentTask.created_by_profile && (
                  <span> by {currentTask.created_by_profile.full_name || currentTask.created_by_profile.email}</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClone}
              disabled={isCloning}
            >
              {isCloning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Cloning...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Clone Task
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}