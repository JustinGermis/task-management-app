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
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, addMonths, subMonths, differenceInDays, addDays, parseISO, isWithinInterval, startOfDay } from 'date-fns'

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
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [draggingTask, setDraggingTask] = useState<{ task: TaskWithDetails; mode: 'move' | 'resize-left' | 'resize-right' } | null>(null)
  const [dragStartX, setDragStartX] = useState(0)

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
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
    if (updatedTask.project_id) {
      cache.invalidate(`tasks:data:${updatedTask.project_id}`)
      cache.invalidate('tasks:data:all')
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

  // Calculate timeline first to use in filtering
  const { days, startDate, endDate } = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })
    return { days, startDate: start, endDate: end }
  }, [currentMonth])

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

    // Only show tasks with dates that overlap with the current month view
    filtered = filtered.filter(task => {
      if (!task.start_date && !task.due_date) return false

      const taskStart = task.start_date ? startOfDay(parseISO(task.start_date)) : null
      const taskEnd = task.due_date ? startOfDay(parseISO(task.due_date)) : null

      const actualStart = taskStart || taskEnd!
      const actualEnd = taskEnd || taskStart!

      // Check if task overlaps with current month
      return isWithinInterval(actualStart, { start: startDate, end: endDate }) ||
             isWithinInterval(actualEnd, { start: startDate, end: endDate }) ||
             (actualStart < startDate && actualEnd > endDate)
    })

    return filtered
  }, [tasks, searchQuery, selectedAssigneeId, currentUser, startDate, endDate])

  const getTaskPosition = (task: TaskWithDetails) => {
    const taskStart = task.start_date ? startOfDay(parseISO(task.start_date)) : null
    const taskEnd = task.due_date ? startOfDay(parseISO(task.due_date)) : null

    if (!taskStart && !taskEnd) return null

    const actualStart = taskStart || taskEnd!
    const actualEnd = taskEnd || taskStart!

    // Clamp to visible month range
    const visibleStart = actualStart < startDate ? startDate : actualStart
    const visibleEnd = actualEnd > endDate ? endDate : actualEnd

    const startOffset = differenceInDays(visibleStart, startDate)
    const duration = Math.max(1, differenceInDays(visibleEnd, visibleStart) + 1)

    const dayWidth = 100 / days.length

    return {
      left: `${startOffset * dayWidth}%`,
      width: `${duration * dayWidth}%`,
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
    setDraggingTask({ task, mode })
    setDragStartX(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingTask) return

    const deltaX = e.clientX - dragStartX
    const dayWidth = (e.currentTarget as HTMLElement).offsetWidth / days.length
    const daysDelta = Math.round(deltaX / dayWidth)

    if (daysDelta === 0) return

    const taskStart = draggingTask.task.start_date ? parseISO(draggingTask.task.start_date) : null
    const taskEnd = draggingTask.task.due_date ? parseISO(draggingTask.task.due_date) : null

    let newStart = taskStart
    let newEnd = taskEnd

    if (draggingTask.mode === 'move') {
      // Move both dates
      if (taskStart) newStart = addDays(taskStart, daysDelta)
      if (taskEnd) newEnd = addDays(taskEnd, daysDelta)
    } else if (draggingTask.mode === 'resize-left') {
      // Resize start date
      if (taskStart) {
        newStart = addDays(taskStart, daysDelta)
        // Ensure start is before end
        if (taskEnd && newStart > taskEnd) newStart = taskEnd
      }
    } else if (draggingTask.mode === 'resize-right') {
      // Resize end date
      if (taskEnd) {
        newEnd = addDays(taskEnd, daysDelta)
        // Ensure end is after start
        if (taskStart && newEnd < taskStart) newEnd = taskStart
      }
    }

    // Update the task
    const updates: any = {}
    if (newStart) updates.start_date = format(newStart, 'yyyy-MM-dd')
    if (newEnd) updates.due_date = format(newEnd, 'yyyy-MM-dd')

    if (Object.keys(updates).length > 0) {
      updateTask(draggingTask.task.id, updates).then((updatedTask) => {
        handleTaskUpdated(updatedTask)
        setDragStartX(e.clientX)
      })
    }
  }

  const handleMouseUp = () => {
    setDraggingTask(null)
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

      {/* Month navigation */}
      <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          Previous
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          Next
        </Button>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Timeline Header */}
        <div className="border-b bg-muted/50">
          <div className="flex">
            <div className="w-64 p-3 border-r font-semibold text-sm">Task</div>
            <div className="flex-1 flex">
              {days.map((day, index) => (
                <div
                  key={index}
                  className="flex-1 p-2 text-center text-xs border-r last:border-r-0"
                  style={{ minWidth: '30px' }}
                >
                  <div className="font-medium">{format(day, 'd')}</div>
                  <div className="text-muted-foreground">{format(day, 'EEE')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Rows */}
        <div
          className="max-h-[600px] overflow-y-auto"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No tasks with dates found. Tasks need start or due dates to appear in Gantt view.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const position = getTaskPosition(task)
              if (!position) return null

              return (
                <div key={task.id} className="flex border-b hover:bg-muted/50 transition-colors">
                  <div className="w-64 p-3 border-r">
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="text-left w-full hover:text-primary transition-colors"
                    >
                      <div className="font-medium text-sm truncate">{task.title}</div>
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
                  <div className="flex-1 relative p-3">
                    <div
                      className="absolute top-1/2 transform -translate-y-1/2 h-8 rounded cursor-move hover:opacity-90 transition-opacity flex items-center px-2 group select-none"
                      style={{
                        left: position.left,
                        width: position.width,
                        backgroundColor: task.color || '#6b7280',
                      }}
                      onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                      onClick={(e) => {
                        if (!draggingTask) setSelectedTask(task)
                      }}
                    >
                      {/* Left resize handle */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 bg-white/30 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/50"
                        onMouseDown={(e) => handleMouseDown(e, task, 'resize-left')}
                      />

                      <span className="text-xs font-medium text-white truncate pointer-events-none">{task.title}</span>

                      {/* Right resize handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/50"
                        onMouseDown={(e) => handleMouseDown(e, task, 'resize-right')}
                      />
                    </div>
                  </div>
                </div>
              )
            })
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
