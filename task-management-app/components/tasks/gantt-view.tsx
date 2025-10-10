'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Search, User, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreateTaskDialog } from './create-task-dialog'
import { TaskDetailsEnhanced } from './task-details-enhanced'
import { OnlineStatus } from '@/components/shared/online-status'
import { getTasks, updateTask, getProjects, getCurrentUserProfile } from '@/lib/api/simple-api'
import { useTaskUpdates } from '@/lib/hooks/use-realtime'
import { TaskWithDetails, Project } from '@/lib/types'
import { TASK_STATUSES, TASK_PRIORITIES } from '@/lib/constants'
import { getRegularTasks } from '@/lib/task-utils'
import { useDataCache } from '@/lib/contexts/data-cache-context'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, addMonths, subMonths, differenceInDays, addDays, parseISO, isWithinInterval, startOfDay, eachMonthOfInterval } from 'date-fns'

interface GanttViewProps {
  projectId?: string
}

const CACHE_KEYS = {
  PROJECTS: 'tasks:projects',
  TASKS: (projectId: string) => `tasks:data:${projectId}`,
}

const DROPDOWN_KEY = 'tasks:selectedProjectId'

export function GanttView({ projectId: propProjectId }: GanttViewProps) {
  const cache = useDataCache()
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('all')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [draggingTask, setDraggingTask] = useState<{ task: TaskWithDetails; mode: 'move' | 'resize-left' | 'resize-right'; originalStart: Date | null; originalEnd: Date | null } | null>(null)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [justDragged, setJustDragged] = useState(false)

  useEffect(() => {
    loadProjects()
    loadCurrentUser()
  }, [])

  useEffect(() => {
    // Restore selected project from cache
    const savedProjectId = cache.get(DROPDOWN_KEY)
    if (savedProjectId) {
      setSelectedProjectId(savedProjectId)
    }
  }, [cache])

  useEffect(() => {
    loadTasks()
  }, [selectedProjectId])

  const handleTaskChange = useCallback((taskId: string, change: 'update' | 'delete') => {
    if (change === 'delete') {
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } else {
      loadTasks()
    }
  }, [selectedProjectId])

  useTaskUpdates(null, handleTaskChange)

  const loadCurrentUser = async () => {
    try {
      const profile = await getCurrentUserProfile()
      setCurrentUser(profile)
    } catch (error) {
      console.error('Failed to load current user:', error)
    }
  }

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
    const cached = cache.get(CACHE_KEYS.PROJECTS)
    if (cached && !cache.isStale(CACHE_KEYS.PROJECTS)) {
      setProjects(cached)
      return
    }

    try {
      const data = await getProjects()
      setProjects(data)
      cache.set(CACHE_KEYS.PROJECTS, data)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const loadTasks = async () => {
    setIsLoading(true)
    const projectFilter = selectedProjectId === 'all' ? undefined : selectedProjectId
    const cacheKey = CACHE_KEYS.TASKS(selectedProjectId)

    const cached = cache.get(cacheKey)
    if (cached && !cache.isStale(cacheKey)) {
      setTasks(cached)
      setIsLoading(false)
      return
    }

    try {
      const data = await getTasks(projectFilter)
      setTasks(data)
      cache.set(cacheKey, data)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(value)
    cache.set(DROPDOWN_KEY, value)
  }

  const handleTaskCreated = (task: TaskWithDetails) => {
    setTasks(prev => [...prev, task])
    if (task.project_id) {
      cache.invalidate(`tasks:data:${task.project_id}`)
      cache.invalidate('tasks:data:all')
    }
  }

  const handleTaskUpdated = (updatedTask: TaskWithDetails) => {
    // If we're viewing a specific project and the task moved to a different project,
    // remove it from the current view
    if (selectedProjectId !== 'all' && updatedTask.project_id !== selectedProjectId) {
      setTasks(prev => prev.filter(t => t.id !== updatedTask.id))
      setSelectedTask(null)
      // Invalidate both the old project (current view) and new project caches
      cache.invalidate(`tasks:data:${selectedProjectId}`)
      cache.invalidate(`tasks:data:${updatedTask.project_id}`)
      cache.invalidate('tasks:data:all')
    } else {
      // Task is still in the current view, update it
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
      if (updatedTask.project_id) {
        cache.invalidate(`tasks:data:${updatedTask.project_id}`)
        cache.invalidate('tasks:data:all')
      }
    }
  }

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setSelectedTask(null)
    const task = tasks.find(t => t.id === taskId)
    if (task?.project_id) {
      cache.invalidate(`tasks:data:${task.project_id}`)
      cache.invalidate('tasks:data:all')
    }
  }

  // Calculate timeline - show range that includes all tasks, or default to current +/- months
  const { days, startDate, endDate, monthGroups } = useMemo(() => {
    const regularTasks = getRegularTasks(tasks).filter(t => t.start_date || t.due_date)

    let start: Date
    let end: Date

    if (regularTasks.length > 0) {
      // Find earliest and latest dates among tasks
      const dates = regularTasks.flatMap(t => [
        t.start_date ? parseISO(t.start_date) : null,
        t.due_date ? parseISO(t.due_date) : null
      ]).filter(d => d !== null) as Date[]

      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

        // Add 1 month buffer on each side
        start = startOfMonth(subMonths(minDate, 1))
        end = endOfMonth(addMonths(maxDate, 1))
      } else {
        // Fallback to current range
        const now = new Date()
        start = startOfMonth(subMonths(now, 2))
        end = endOfMonth(addMonths(now, 3))
      }
    } else {
      // No tasks with dates, show current range
      const now = new Date()
      start = startOfMonth(subMonths(now, 2))
      end = endOfMonth(addMonths(now, 3))
    }

    const days = eachDayOfInterval({ start, end })

    // Group days by month for headers
    const months = eachMonthOfInterval({ start, end })
    const monthGroups = months.map(monthStart => {
      const monthEnd = endOfMonth(monthStart)
      const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
      return {
        month: monthStart,
        days: monthDays,
        label: format(monthStart, 'MMMM yyyy')
      }
    })

    return { days, startDate: start, endDate: end, monthGroups }
  }, [tasks])

  // Filter tasks - remove sections first, then apply other filters
  const filteredTasks = useMemo(() => {
    let filtered = getRegularTasks(tasks)

    // Filter by assignee
    if (selectedAssigneeId === 'me' && currentUser) {
      filtered = filtered.filter(task =>
        task.assignees?.some(a => a.user_id === currentUser.id)
      )
    } else if (selectedAssigneeId !== 'all') {
      filtered = filtered.filter(task =>
        task.assignees?.some(a => a.user_id === selectedAssigneeId)
      )
    }

    // Enhanced search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(task => {
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

    // Only show tasks with dates
    filtered = filtered.filter(task => task.start_date || task.due_date)

    return filtered
  }, [tasks, searchQuery, selectedAssigneeId, currentUser, startDate, endDate])

  const getTaskPosition = (task: TaskWithDetails, applyDragOffset = false) => {
    const taskStart = task.start_date ? startOfDay(parseISO(task.start_date)) : null
    const taskEnd = task.due_date ? startOfDay(parseISO(task.due_date)) : null

    if (!taskStart && !taskEnd) return null

    const DAY_WIDTH = 40 // Fixed pixel width per day

    let actualStart = taskStart || taskEnd!
    let actualEnd = taskEnd || taskStart!

    // Apply drag offset for visual preview
    if (applyDragOffset && draggingTask && draggingTask.task.id === task.id && dragOffset !== 0) {
      const daysDelta = Math.round(dragOffset / DAY_WIDTH)

      if (draggingTask.mode === 'move') {
        if (actualStart) actualStart = addDays(actualStart, daysDelta)
        if (actualEnd) actualEnd = addDays(actualEnd, daysDelta)
      } else if (draggingTask.mode === 'resize-left') {
        if (actualStart) {
          const newStart = addDays(actualStart, daysDelta)
          if (actualEnd && newStart <= actualEnd) actualStart = newStart
        }
      } else if (draggingTask.mode === 'resize-right') {
        if (actualEnd) {
          const newEnd = addDays(actualEnd, daysDelta)
          if (actualStart && newEnd >= actualStart) actualEnd = newEnd
        }
      }
    }

    // Clamp to visible range
    const visibleStart = actualStart < startDate ? startDate : actualStart
    const visibleEnd = actualEnd > endDate ? endDate : actualEnd

    const startOffset = differenceInDays(visibleStart, startDate)
    const duration = Math.max(1, differenceInDays(visibleEnd, visibleStart) + 1)

    return {
      left: `${startOffset * DAY_WIDTH}px`,
      width: `${duration * DAY_WIDTH}px`,
      task
    }
  }

  const getStatusColor = (status: string) => {
    const statusConfig = TASK_STATUSES.find(s => s.id === status)
    return statusConfig?.bgColor || 'bg-gray-500'
  }

  const getPriorityColor = (priority: string) => {
    const priorityConfig = TASK_PRIORITIES.find(p => p.id === priority)
    return priorityConfig?.color || 'text-gray-500'
  }

  const handleMouseDown = (e: React.MouseEvent, task: TaskWithDetails, mode: 'move' | 'resize-left' | 'resize-right') => {
    e.stopPropagation()
    const taskStart = task.start_date ? parseISO(task.start_date) : null
    const taskEnd = task.due_date ? parseISO(task.due_date) : null

    setDraggingTask({
      task,
      mode,
      originalStart: taskStart,
      originalEnd: taskEnd
    })
    setDragStartX(e.clientX)
    setDragOffset(0)
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingTask) return

    const deltaX = e.clientX - dragStartX

    // Mark as dragging if moved more than 5px
    if (Math.abs(deltaX) > 5 && !isDragging) {
      setIsDragging(true)
    }

    setDragOffset(deltaX)
  }

  const handleMouseUp = async () => {
    if (!draggingTask || !isDragging) {
      setDraggingTask(null)
      setDragOffset(0)
      setIsDragging(false)
      return
    }

    const DAY_WIDTH = 40
    const daysDelta = Math.round(dragOffset / DAY_WIDTH)

    if (daysDelta === 0) {
      setDraggingTask(null)
      setDragOffset(0)
      setIsDragging(false)
      return
    }

    let newStart = draggingTask.originalStart
    let newEnd = draggingTask.originalEnd

    if (draggingTask.mode === 'move') {
      // Move both dates
      if (draggingTask.originalStart) newStart = addDays(draggingTask.originalStart, daysDelta)
      if (draggingTask.originalEnd) newEnd = addDays(draggingTask.originalEnd, daysDelta)
    } else if (draggingTask.mode === 'resize-left') {
      // Resize start date
      if (draggingTask.originalStart) {
        newStart = addDays(draggingTask.originalStart, daysDelta)
        // Ensure start is before end
        if (draggingTask.originalEnd && newStart > draggingTask.originalEnd) newStart = draggingTask.originalEnd
      }
    } else if (draggingTask.mode === 'resize-right') {
      // Resize end date
      if (draggingTask.originalEnd) {
        newEnd = addDays(draggingTask.originalEnd, daysDelta)
        // Ensure end is after start
        if (draggingTask.originalStart && newEnd < draggingTask.originalStart) newEnd = draggingTask.originalStart
      }
    }

    const taskId = draggingTask.task.id

    // Optimistically update UI immediately
    const optimisticUpdates: any = {}
    if (newStart) optimisticUpdates.start_date = format(newStart, 'yyyy-MM-dd')
    if (newEnd) optimisticUpdates.due_date = format(newEnd, 'yyyy-MM-dd')

    if (Object.keys(optimisticUpdates).length > 0) {
      // Update local state immediately for instant feedback
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, ...optimisticUpdates }
          : t
      ))
    }

    // Reset drag state immediately for instant release
    setDraggingTask(null)
    setDragOffset(0)
    setIsDragging(false)

    // Set flag to prevent click event from opening dialog
    setJustDragged(true)
    setTimeout(() => setJustDragged(false), 100)

    // Update database in background
    if (Object.keys(optimisticUpdates).length > 0) {
      try {
        const updatedTask = await updateTask(taskId, optimisticUpdates)
        handleTaskUpdated(updatedTask)
      } catch (error) {
        console.error('Failed to update task:', error)
        // Revert optimistic update on error
        loadTasks()
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={selectedProjectId} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All projects" />
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

          <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
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

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks, projects, people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">New Task</span>
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg bg-card flex flex-col">
        {/* Task Rows with integrated header */}
        <div className="max-h-[600px] overflow-auto gantt-timeline">
          {/* Timeline Header - Month groups */}
          <div className="sticky top-0 z-20 border-b bg-muted/50">
            <div className="flex">
              <div className="w-64 p-3 border-r font-semibold text-sm sticky left-0 bg-muted/50 z-30">Task</div>
              <div className="flex" style={{ minWidth: `${days.length * 40}px` }}>
                {monthGroups.map((monthGroup, monthIndex) => (
                  <div key={monthIndex} className="border-r last:border-r-0">
                    <div className="p-2 text-center font-semibold text-sm border-b bg-muted">
                      {monthGroup.label}
                    </div>
                    <div className="flex">
                      {monthGroup.days.map((day, dayIndex) => (
                        <div
                          key={dayIndex}
                          className="p-2 text-center text-xs border-r last:border-r-0"
                          style={{ width: '40px', minWidth: '40px' }}
                        >
                          <div className="font-medium">{format(day, 'd')}</div>
                          <div className="text-muted-foreground text-[10px]">{format(day, 'EEE')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task Rows */}
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No tasks with dates found. Tasks need start or due dates to appear in Gantt view.
            </div>
          ) : (
            <div
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {filteredTasks.map((task) => {
                const position = getTaskPosition(task, true)
                if (!position) return null

                return (
                  <div key={task.id} className="flex border-b hover:bg-muted/50 transition-colors">
                    <div className="w-64 p-3 border-r sticky left-0 bg-card z-10">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="text-left w-full hover:text-primary transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: task.project?.color || task.color || '#6b7280' }}
                          />
                          <div className="font-medium text-sm truncate">{task.title}</div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className={`${getStatusColor(task.status)} text-xs`}>
                            {TASK_STATUSES.find(s => s.id === task.status)?.label}
                          </Badge>
                          {task.assignees && task.assignees.length > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {task.assignees.length}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                    <div className="relative" style={{ minWidth: `${days.length * 40}px`, height: '60px' }}>
                      <div
                        className={`absolute top-1/2 transform -translate-y-1/2 h-10 rounded-lg transition-all flex items-center px-3 group select-none shadow-sm ${
                          draggingTask?.task.id === task.id && isDragging
                            ? 'opacity-75 shadow-lg scale-105 cursor-grabbing'
                            : 'cursor-grab hover:shadow-md'
                        }`}
                        style={{
                          left: position.left,
                          width: position.width,
                          backgroundColor: task.project?.color || task.color || '#6366f1',
                        }}
                        onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                        onClick={(e) => {
                          if (!isDragging && !justDragged) setSelectedTask(task)
                        }}
                      >
                        {/* Left resize handle */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-3 bg-black/10 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/20 rounded-l-lg"
                          onMouseDown={(e) => handleMouseDown(e, task, 'resize-left')}
                          title="Drag to adjust start date"
                        />

                        <span className="text-sm font-semibold text-white truncate pointer-events-none drop-shadow-sm">{task.title}</span>

                        {/* Right resize handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-3 bg-black/10 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/20 rounded-r-lg"
                          onMouseDown={(e) => handleMouseDown(e, task, 'resize-right')}
                          title="Drag to adjust due date"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Task Details Dialog */}
      <TaskDetailsEnhanced
        task={selectedTask}
        isOpen={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onTaskCreated={handleTaskCreated}
        projectId={selectedProjectId === 'all' ? undefined : selectedProjectId}
      />

      <OnlineStatus />
    </div>
  )
}
