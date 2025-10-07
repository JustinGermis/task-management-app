'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, Clock, AlertCircle, Folder, Plus, MoreVertical, Edit } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getTasks, getCurrentUserProfile, updateTask } from '@/lib/api/simple-api'
import { TaskDetailsEnhanced } from './task-details-enhanced'
import { CreateTaskDialog } from './create-task-dialog'
import { useDataCache } from '@/lib/contexts/data-cache-context'
import { formatDate } from '@/lib/utils'

interface TaskWithDetails {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  due_date?: string
  project_id: string
  assignees?: Array<{
    id: string
    user_id: string
    profile?: {
      id: string
      email: string
      full_name?: string
    }
  }>
  project?: {
    id: string
    name: string
  }
}

const CACHE_KEYS = {
  MY_TASKS: 'tasks:my-tasks',
  PROFILE: 'tasks:profile',
}

const statusOrder = ['todo', 'in_progress', 'in_review', 'done', 'cancelled']
const statusConfig = {
  todo: { label: 'To Do', icon: Circle, color: 'bg-gray-500' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'bg-blue-500' },
  in_review: { label: 'In Review', icon: AlertCircle, color: 'bg-yellow-500' },
  done: { label: 'Done', icon: CheckCircle2, color: 'bg-green-500' },
  cancelled: { label: 'Cancelled', icon: Circle, color: 'bg-red-500' },
}

export function MyTasksView() {
  const cache = useDataCache()
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // Listen for cache updates from other views
  useEffect(() => {
    const handleCacheUpdate = (event: CustomEvent) => {
      const { key, data } = event.detail

      // If any project tasks were updated, reload my tasks
      if (key.startsWith('tasks:list:') || key.startsWith('tasks:kanban:') || key.startsWith('tasks:structure:')) {
        loadMyTasks()
      }
    }

    window.addEventListener('cache-updated', handleCacheUpdate as EventListener)
    return () => window.removeEventListener('cache-updated', handleCacheUpdate as EventListener)
  }, [currentUser])

  const loadData = async () => {
    // Check cache first
    const cachedProfile = cache.get(CACHE_KEYS.PROFILE)

    if (cachedProfile && !cache.isStale(CACHE_KEYS.PROFILE)) {
      setCurrentUser(cachedProfile)
      await loadMyTasks(cachedProfile.id)
      setIsLoading(false)
      return
    }

    try {
      const profile = await getCurrentUserProfile()
      setCurrentUser(profile)
      cache.set(CACHE_KEYS.PROFILE, profile)
      await loadMyTasks(profile.id)
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMyTasks = async (userId?: string) => {
    const userIdToUse = userId || currentUser?.id
    if (!userIdToUse) return

    // Check cache first
    const cached = cache.get(CACHE_KEYS.MY_TASKS)
    if (cached && !cache.isStale(CACHE_KEYS.MY_TASKS)) {
      setTasks(cached.filter((t: TaskWithDetails) =>
        t.assignees?.some(a => a.user_id === userIdToUse)
      ))
      return
    }

    try {
      // Fetch all tasks (no project filter)
      const allTasks = await getTasks()

      // Filter to only tasks assigned to current user
      const myTasks = allTasks.filter((t: TaskWithDetails) =>
        t.assignees?.some(a => a.user_id === userIdToUse)
      )

      setTasks(myTasks)
      cache.set(CACHE_KEYS.MY_TASKS, myTasks)
    } catch (error) {
      console.error('Failed to load my tasks:', error)
    }
  }

  const updateTasksAndCache = useCallback((updater: (prev: TaskWithDetails[]) => TaskWithDetails[]) => {
    setTasks(prev => {
      const updated = updater(prev)
      cache.set(CACHE_KEYS.MY_TASKS, updated)
      return updated
    })
  }, [cache])

  const handleTaskUpdated = (updatedTask: TaskWithDetails) => {
    updateTasksAndCache(prev => {
      const updated = prev.map(t =>
        t.id === updatedTask.id ? updatedTask : t
      )
      return updated
    })

    // Invalidate project-specific caches so other views reload
    if (updatedTask.project_id) {
      cache.invalidate(`tasks:list:${updatedTask.project_id}`)
      cache.invalidate(`tasks:kanban:${updatedTask.project_id}`)
      cache.invalidate(`tasks:structure:${updatedTask.project_id}`)
      // Also invalidate 'all' caches
      cache.invalidate('tasks:list:all')
      cache.invalidate('tasks:kanban:all')
      cache.invalidate('tasks:structure:all')
    }

    if (selectedTask && selectedTask.id === updatedTask.id) {
      setSelectedTask(updatedTask)
    }
  }

  const handleTaskDeleted = (taskId: string) => {
    const deletedTask = tasks.find(t => t.id === taskId)

    updateTasksAndCache(prev => prev.filter(t => t.id !== taskId))
    setSelectedTask(null)

    // Invalidate project-specific caches so other views reload
    if (deletedTask?.project_id) {
      cache.invalidate(`tasks:list:${deletedTask.project_id}`)
      cache.invalidate(`tasks:kanban:${deletedTask.project_id}`)
      cache.invalidate(`tasks:structure:${deletedTask.project_id}`)
      // Also invalidate 'all' caches
      cache.invalidate('tasks:list:all')
      cache.invalidate('tasks:kanban:all')
      cache.invalidate('tasks:structure:all')
    }
  }

  const handleTaskCreated = (newTask: TaskWithDetails) => {
    // Add the new task to the list
    updateTasksAndCache(prev => [newTask, ...prev])

    // Invalidate project-specific caches so other views reload
    if (newTask.project_id) {
      cache.invalidate(`tasks:list:${newTask.project_id}`)
      cache.invalidate(`tasks:kanban:${newTask.project_id}`)
      cache.invalidate(`tasks:structure:${newTask.project_id}`)
      // Also invalidate 'all' caches
      cache.invalidate('tasks:list:all')
      cache.invalidate('tasks:kanban:all')
      cache.invalidate('tasks:structure:all')
    }

    setShowCreateDialog(false)
  }

  const handleQuickStatusChange = async (task: TaskWithDetails, newStatus: string) => {
    try {
      const updated = await updateTask(task.id, { status: newStatus })

      // Update task in list
      updateTasksAndCache(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ))

      // Invalidate caches
      if (task.project_id) {
        cache.invalidate(`tasks:list:${task.project_id}`)
        cache.invalidate(`tasks:kanban:${task.project_id}`)
        cache.invalidate(`tasks:structure:${task.project_id}`)
        cache.invalidate('tasks:list:all')
        cache.invalidate('tasks:kanban:all')
        cache.invalidate('tasks:structure:all')
      }
    } catch (error) {
      console.error('Failed to update task status:', error)
    }
  }

  const groupedTasks = statusOrder.reduce((acc, status) => {
    acc[status] = tasks.filter(t => t.status === status)
    return acc
  }, {} as Record<string, TaskWithDetails[]>)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 dark:text-red-400'
      case 'high': return 'text-orange-600 dark:text-orange-400'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400'
      case 'low': return 'text-green-600 dark:text-green-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <>
        <div className="flex justify-end mb-4">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No tasks assigned to you</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create a task to get started
              </p>
              <Button
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Task
              </Button>
            </div>
          </CardContent>
        </Card>

        <CreateTaskDialog
          isOpen={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onTaskCreated={handleTaskCreated}
          defaultAssigneeId={currentUser?.id}
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </div>
      {statusOrder.map(status => {
        const statusTasks = groupedTasks[status]
        if (statusTasks.length === 0) return null

        const config = statusConfig[status as keyof typeof statusConfig]
        const Icon = config.icon

        return (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${config.color}`} />
                {config.label}
                <Badge variant="secondary" className="ml-2">
                  {statusTasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusTasks.map(task => (
                  <div
                    key={task.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-all bg-card"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <h4
                              className="font-medium text-base cursor-pointer hover:text-primary truncate"
                              onClick={() => setSelectedTask(task)}
                            >
                              {task.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge
                              variant="outline"
                              className={`${getPriorityColor(task.priority)} text-xs`}
                            >
                              {task.priority}
                            </Badge>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSelectedTask(task)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                {statusOrder.filter(s => s !== task.status).map(newStatus => {
                                  const newConfig = statusConfig[newStatus as keyof typeof statusConfig]
                                  const NewIcon = newConfig.icon
                                  return (
                                    <DropdownMenuItem
                                      key={newStatus}
                                      onClick={() => handleQuickStatusChange(task, newStatus)}
                                    >
                                      <NewIcon className="mr-2 h-4 w-4" />
                                      {newConfig.label}
                                    </DropdownMenuItem>
                                  )
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 ml-6">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap ml-6">
                          {task.project && (
                            <div className="flex items-center gap-1">
                              <Folder className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{task.project.name}</span>
                            </div>
                          )}

                          {task.due_date && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Due {formatDate(task.due_date)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {selectedTask && (
        <TaskDetailsEnhanced
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
        />
      )}

      <CreateTaskDialog
        isOpen={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTaskCreated={handleTaskCreated}
        defaultAssigneeId={currentUser?.id}
      />
    </div>
  )
}
