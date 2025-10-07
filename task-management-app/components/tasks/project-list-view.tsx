'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  useDroppable
} from '@dnd-kit/core'
import { 
  SortableContext, 
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates 
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Search, ChevronDown, ChevronRight, Calendar, User, Flag, Edit2, GripVertical, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreateTaskDialog } from './create-task-dialog'
import { TaskDetailsEnhanced } from './task-details-enhanced'
import { OnlineStatus } from '@/components/shared/online-status'
import { getTasks, updateTask, getProjects, getCurrentUserProfile } from '@/lib/api/simple-api'
import { useTaskUpdates } from '@/lib/hooks/use-realtime'
import { TaskWithDetails, Project } from '@/lib/types'
import { TASK_STATUSES, TASK_PRIORITIES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { getRegularTasks } from '@/lib/task-utils'
import { useDataCache } from '@/lib/contexts/data-cache-context'

interface ProjectListViewProps {
  projectId?: string
}

const CACHE_KEYS = {
  PROJECTS: 'tasks:projects', // Shared across all views
  TASKS: (projectId: string) => `tasks:data:${projectId}`, // Shared across all views
}

const DROPDOWN_KEY = 'tasks:selectedProjectId' // Shared across all views

interface DraggableTaskItemProps {
  task: TaskWithDetails
  onTaskClick: (task: TaskWithDetails) => void
}

function DraggableTaskItem({ task, onTaskClick }: DraggableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getPriorityColor = (priority: string) => {
    const priorityConfig = TASK_PRIORITIES.find(p => p.id === priority)
    return priorityConfig?.color || 'text-gray-500'
  }

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500'
      case 'high': return 'border-l-orange-500'
      case 'medium': return 'border-l-yellow-500'
      case 'low': return 'border-l-green-500'
      default: return 'border-l-gray-500'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-l-4 ${getPriorityBorderColor(task.priority || 'medium')} ${
        isDragging ? 'bg-muted shadow-lg ring-2 ring-primary/20 z-50' : ''
      }`}
    >
      <div className="flex gap-3 p-4 hover:bg-muted/50 transition-all">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none mt-1 flex-shrink-0 p-1 rounded hover:bg-muted/50 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Content - Clickable */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onTaskClick(task)}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <span className="font-medium truncate">
                {task.title}
              </span>
              <Badge
                variant="outline"
                className={`${getPriorityColor(task.priority || 'medium')} border-current text-xs flex-shrink-0`}
              >
                <Flag className="w-3 h-3 mr-1" />
                {task.priority}
              </Badge>
            </div>
            <Edit2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center space-x-4 text-xs text-muted-foreground flex-wrap">
            {task.due_date && (
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>Due {formatDate(task.due_date || '')}</span>
              </div>
            )}

            {/* Assignees */}
            {task.assignees && task.assignees.length > 0 && (
              <div className="flex items-center space-x-1">
                <span>Assigned to:</span>
                <div className="flex items-center -space-x-1">
                  {task.assignees.slice(0, 2).map((assignee: any) => {
                    const isAutoAssigned = task.metadata?.autoAssigned &&
                                         task.metadata?.assignedEmail === assignee.profiles?.email
                    const initials = assignee.profiles?.full_name
                      ? assignee.profiles.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                      : assignee.profiles?.email?.slice(0, 2).toUpperCase() || 'U'

                    return (
                      <div key={assignee.id} className="relative">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium border border-background ${
                          isAutoAssigned ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
                        }`}>
                          {initials}
                        </div>
                        {isAutoAssigned && (
                          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full border border-background" />
                        )}
                      </div>
                    )
                  })}
                  {task.assignees.length > 2 && (
                    <span className="ml-1 text-muted-foreground">
                      +{task.assignees.length - 2}
                    </span>
                  )}
                </div>
              </div>
            )}

            <span>Created {formatDate(task.created_at || '')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DroppableStatusSectionProps {
  status: any
  tasks: TaskWithDetails[]
  onTaskClick: (task: TaskWithDetails) => void
  onCreateTask: (status: string) => void
}

function DroppableStatusSection({ status, tasks, onTaskClick, onCreateTask }: DroppableStatusSectionProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `status-${status.id}`,
  })

  return (
    <Card key={status.id} className={`overflow-hidden transition-colors ${isOver ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
      <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
            <span>{status.label}</span>
            <Badge variant="secondary">{tasks.length}</Badge>
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCreateTask(status.id)}
            className="opacity-70 hover:opacity-100"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0" ref={setNodeRef}>
        <div className="divide-y min-h-[100px]">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <DraggableTaskItem
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
              />
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <div className="mb-2">No tasks in {status.label.toLowerCase()}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCreateTask(status.id)}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Create task here
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ProjectListView({ projectId }: ProjectListViewProps) {
  const cache = useDataCache()
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (projectId) return projectId
    const saved = localStorage.getItem(DROPDOWN_KEY)
    return saved || 'all'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [activeTask, setActiveTask] = useState<TaskWithDetails | null>(null)
  const [createTaskStatus, setCreateTaskStatus] = useState<string | undefined>()
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('all')
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadCurrentUser()
    if (!projectId) {
      loadProjects()
    }
    loadTasks()
  }, [projectId])

  // Listen for cache updates from other views
  useEffect(() => {
    const handleCacheUpdate = (event: CustomEvent) => {
      const { key, data } = event.detail
      // If tasks cache for our project was updated, use the data from the event
      if (key === CACHE_KEYS.TASKS(selectedProjectId) && data) {
        setTasks(data)
      }
    }

    window.addEventListener('cache-updated', handleCacheUpdate as EventListener)
    return () => window.removeEventListener('cache-updated', handleCacheUpdate as EventListener)
  }, [selectedProjectId])

  useEffect(() => {
    loadTasks()
    // Save selection to localStorage (only if not passed as prop)
    if (!projectId) {
      localStorage.setItem(DROPDOWN_KEY, selectedProjectId)
    }
  }, [selectedProjectId])

  // Helper to update both state and cache
  const updateTasksAndCache = (updater: (prev: TaskWithDetails[]) => TaskWithDetails[]) => {
    setTasks(prev => {
      const newTasks = updater(prev)
      console.log('[List] Updating cache for project:', selectedProjectId, 'tasks:', newTasks.length)
      // Update cache with new state
      cache.set(CACHE_KEYS.TASKS(selectedProjectId), newTasks)

      // Also update the "all" cache if it exists and we're in a specific project
      if (selectedProjectId !== 'all') {
        const allCacheKey = CACHE_KEYS.TASKS('all')
        const allCache = cache.get(allCacheKey)
        console.log('[List] Checking for "all" cache:', allCacheKey, 'exists:', !!allCache)
        if (allCache) {
          console.log('[List] "all" cache exists with', allCache.length, 'tasks, updating...')
          console.log('[List] newTasks IDs:', newTasks.map(t => t.id))
          console.log('[List] allCache IDs:', allCache.map((t: TaskWithDetails) => t.id))
          // Update the task in the "all" cache too
          const updatedAllCache = allCache.map((t: TaskWithDetails) => {
            const updated = newTasks.find((nt: TaskWithDetails) => nt.id === t.id)
            if (updated && t.id === updated.id && t.status !== updated.status) {
              console.log('[List] Updating task in "all" cache:', t.id, 'status:', t.status, '->', updated.status)
            }
            return updated || t
          })
          console.log('[List] Setting updated "all" cache with', updatedAllCache.length, 'tasks')
          cache.set(allCacheKey, updatedAllCache)
        } else {
          console.log('[List] "all" cache does not exist, skipping cross-cache update')
        }
      } else {
        console.log('[List] selectedProjectId is "all", not doing cross-cache update')
      }
      return newTasks
    })
  }

  // Set up real-time task updates - also update cache
  const handleTaskChange = useCallback((type: 'INSERT' | 'UPDATE' | 'DELETE', task: any) => {
    updateTasksAndCache(prev => {
      switch (type) {
        case 'INSERT':
          if (prev.some(t => t.id === task.id)) return prev
          return [...prev, task]
        case 'UPDATE':
          return prev.map(t => t.id === task.id ? { ...t, ...task } : t)
        case 'DELETE':
          return prev.filter(t => t.id !== task.id)
        default:
          return prev
      }
    })
  }, [selectedProjectId, cache, updateTasksAndCache])

  useTaskUpdates(selectedProjectId || null, handleTaskChange)

  const loadCurrentUser = async () => {
    try {
      const profile = await getCurrentUserProfile()
      setCurrentUser(profile)
    } catch (error) {
      console.error('Failed to load current user:', error)
    }
  }

  // Get unique assignees from all tasks
  const uniqueAssignees = Array.from(
    new Map(
      tasks.flatMap(task =>
        (task.assignees || []).map(a => [
          a.user_id,
          {
            id: a.user_id,
            name: a.profile?.full_name || a.profile?.email || 'Unknown',
            email: a.profile?.email || ''
          }
        ])
      )
    ).values()
  )

  const loadProjects = async () => {
    // Check cache first
    const cached = cache.get(CACHE_KEYS.PROJECTS)
    if (cached && !cache.isStale(CACHE_KEYS.PROJECTS)) {
      setProjects(cached)
      return
    }

    try {
      const data = await getProjects()
      setProjects(data)
      cache.set(CACHE_KEYS.PROJECTS, data)
      if (!selectedProjectId && data.length > 0) {
        setSelectedProjectId(data[0].id)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const loadTasks = async () => {
    const cacheKey = CACHE_KEYS.TASKS(selectedProjectId)

    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && !cache.isStale(cacheKey)) {
      setTasks(cached)
      setIsLoading(false)
      return
    }

    try {
      const effectiveProjectId = projectId || selectedProjectId
      const data = await getTasks(effectiveProjectId === 'all' ? undefined : effectiveProjectId)
      // Filter out sections - list view only shows regular tasks
      const regularTasks = getRegularTasks(data)
      setTasks(regularTasks)
      cache.set(cacheKey, regularTasks)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskCreated = (newTask: TaskWithDetails) => {
    updateTasksAndCache(prev => [...prev, newTask])
    setIsCreateDialogOpen(false)
    setCreateTaskStatus(undefined)
    // Also invalidate 'all' cache if we're in a specific project
    if (selectedProjectId !== 'all') {
      cache.invalidate(CACHE_KEYS.TASKS('all'))
    }
  }

  const handleCreateTaskInStatus = (status: string) => {
    setCreateTaskStatus(status)
    setIsCreateDialogOpen(true)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const overId = over.id as string
    let newStatus = task.status
    let newPosition: number | undefined

    // Check if we're dropping on a status container
    if (overId.startsWith('status-')) {
      newStatus = overId.replace('status-', '')
    } else {
      // If dropping on another task, handle reordering
      const overTask = tasks.find(t => t.id === overId)
      if (overTask) {
        newStatus = overTask.status
        
        // If within the same status, handle reordering
        if (task.status === newStatus) {
          const statusTasks = tasks
            .filter(t => t.status === newStatus)
            .sort((a, b) => (a.position || 0) - (b.position || 0))
          
          const oldIndex = statusTasks.findIndex(t => t.id === taskId)
          const newIndex = statusTasks.findIndex(t => t.id === overId)
          
          if (oldIndex !== -1 && newIndex !== -1) {
            // Calculate new position based on surrounding tasks
            if (newIndex > oldIndex) {
              // Moving down
              const nextTask = statusTasks[newIndex + 1]
              newPosition = nextTask 
                ? (overTask.position || 0) + ((nextTask.position || 1000) - (overTask.position || 0)) / 2
                : (overTask.position || 0) + 1000
            } else {
              // Moving up
              const prevTask = statusTasks[newIndex - 1]
              newPosition = prevTask
                ? (prevTask.position || 0) + ((overTask.position || 1000) - (prevTask.position || 0)) / 2
                : (overTask.position || 0) / 2
            }
          }
        }
      }
    }

    // Update task if status or position changed
    if (task.status !== newStatus || newPosition !== undefined) {
      const updates: any = { status: newStatus }
      if (newPosition !== undefined) {
        updates.position = newPosition
      }

      // Optimistic update - update both state and cache
      updateTasksAndCache(prev => prev.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      ))

      try {
        await updateTask(taskId, updates)
      } catch (error) {
        console.error('Failed to update task:', error)
        // Revert optimistic update
        loadTasks()
      }
    }
  }

  const handleTaskUpdated = (updatedTask: TaskWithDetails) => {
    console.log('[List] handleTaskUpdated called:', updatedTask.id, 'status:', updatedTask.status)
    updateTasksAndCache(prev => {
      const updated = prev.map(t =>
        t.id === updatedTask.id ? updatedTask : t
      )
      console.log('[List] Updated tasks, count:', updated.length)
      return updated
    })
    // Also update the selectedTask if it's the one being updated
    if (selectedTask && selectedTask.id === updatedTask.id) {
      console.log('[List] Updating selectedTask with new data')
      setSelectedTask(updatedTask)
    }
  }

  const handleTaskDeleted = (taskId: string) => {
    updateTasksAndCache(prev => prev.filter(t => t.id !== taskId))
    setSelectedTask(null)
    // Also invalidate 'all' cache if we're in a specific project
    if (selectedProjectId !== 'all') {
      cache.invalidate(CACHE_KEYS.TASKS('all'))
    }
  }

  const handleTaskCloned = (clonedTask: TaskWithDetails) => {
    updateTasksAndCache(prev => [...prev, clonedTask])
    // Also invalidate 'all' cache if we're in a specific project
    if (selectedProjectId !== 'all') {
      cache.invalidate(CACHE_KEYS.TASKS('all'))
    }
  }

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const getStatusColor = (status: string) => {
    const statusConfig = TASK_STATUSES.find(s => s.id === status)
    return statusConfig?.color || 'bg-gray-500'
  }

  const getPriorityColor = (priority: string) => {
    const priorityConfig = TASK_PRIORITIES.find(p => p.id === priority)
    return priorityConfig?.color || 'text-gray-500'
  }

  // Filter tasks by assignee and search query
  // First filter out sections (tasks with 📁 prefix)
  let filteredTasks = getRegularTasks(tasks)

  // Filter by assignee
  if (selectedAssigneeId === 'me' && currentUser) {
    filteredTasks = filteredTasks.filter(task =>
      task.assignees?.some(a => a.user_id === currentUser.id)
    )
  } else if (selectedAssigneeId !== 'all') {
    filteredTasks = filteredTasks.filter(task =>
      task.assignees?.some(a => a.user_id === selectedAssigneeId)
    )
  }

  // Enhanced search: search in task title, description, project name, and assignee names
  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filteredTasks = filteredTasks.filter(task => {
      const titleMatch = task.title.toLowerCase().includes(query)
      const descMatch = task.description?.toLowerCase().includes(query)
      const projectMatch = task.project?.name.toLowerCase().includes(query)
      const assigneeMatch = task.assignees?.some(a =>
        a.profile?.full_name?.toLowerCase().includes(query) ||
        a.profile?.email?.toLowerCase().includes(query)
      )
      return titleMatch || descMatch || projectMatch || assigneeMatch
    })
  }

  // Group tasks by status for better organization and sort by position
  const groupedTasks = TASK_STATUSES.reduce((acc, status) => {
    acc[status.id] = filteredTasks
      .filter(task => task.status === status.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
    return acc
  }, {} as Record<string, TaskWithDetails[]>)

  const currentProject = projects.find(p => p.id === (projectId || selectedProjectId))

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Project Tasks</h2>
            <p className="text-muted-foreground">List view for project tasks</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {currentProject ? `${currentProject.name} Tasks` : 'Project Tasks'}
          </h2>
          <p className="text-muted-foreground">List view for project tasks</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full sm:w-auto">
          <div className="relative w-full sm:flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks, projects, or people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {!projectId && (
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  All assignees
                </div>
              </SelectItem>
              {currentUser && (
                <SelectItem value="me">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assigned to me
                  </div>
                </SelectItem>
              )}
              {uniqueAssignees.map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  <div className="flex flex-col items-start">
                    <span>{assignee.name}</span>
                    {assignee.email && assignee.name !== assignee.email && (
                      <span className="text-xs text-muted-foreground">{assignee.email}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">Total:</span>
          <Badge variant="secondary">{filteredTasks.length} tasks</Badge>
        </div>
      </div>

      {/* Task List by Status with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          {TASK_STATUSES.map((status) => {
            const statusTasks = groupedTasks[status.id] || []
            
            return (
              <SortableContext
                key={status.id}
                items={statusTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <DroppableStatusSection
                  status={status}
                  tasks={statusTasks}
                  onTaskClick={setSelectedTask}
                  onCreateTask={handleCreateTaskInStatus}
                />
              </SortableContext>
            )
          })}
        </div>
        
        <DragOverlay>
          {activeTask ? (
            <div className="bg-background border-2 border-primary/20 rounded-lg shadow-2xl p-4 opacity-90">
              <div className="font-medium">{activeTask.title}</div>
              {activeTask.description && (
                <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {activeTask.description}
                </div>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {activeTask.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {activeTask.priority}
                </Badge>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {filteredTasks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Try adjusting your search criteria'
                  : 'Create your first task to get started'
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Task
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Online Status Indicator */}
      <OnlineStatus />

      {/* Dialogs */}
      <CreateTaskDialog 
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTaskCreated={handleTaskCreated}
        projectId={projectId || (selectedProjectId === 'all' ? undefined : selectedProjectId)}
        defaultStatus={createTaskStatus}
      />
      
      <TaskDetailsEnhanced
        task={selectedTask}
        isOpen={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
        onTaskCloned={handleTaskCloned}
      />
    </div>
  )
}