'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Plus, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { KanbanColumn } from './kanban-column'
import { TaskCard } from './task-card'
import { TaskCardOverlay } from './task-card-overlay'
import { CreateTaskDialog } from './create-task-dialog'
import { TaskDetailsEnhanced } from './task-details-enhanced'
import { OnlineStatus } from '@/components/shared/online-status'
import { getTasks, updateTask, getProjects } from '@/lib/api/simple-api'
import { useTaskUpdates } from '@/lib/hooks/use-realtime'
import { TaskWithDetails, TaskStatus, Column, Project } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getRegularTasks } from '@/lib/task-utils'

import { TASK_STATUSES } from '@/lib/constants'

const COLUMNS = TASK_STATUSES.map(status => ({
  id: status.id,
  title: status.label,
  color: status.color
}))

export function KanbanBoard() {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [columns, setColumns] = useState<Column[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<TaskWithDetails | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')

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
    loadProjects()
    loadTasks()
  }, [])

  useEffect(() => {
    loadTasks()
  }, [selectedProjectId])

  // Set up real-time task updates
  const handleTaskChange = useCallback((type: 'INSERT' | 'UPDATE' | 'DELETE', task: any) => {
    setTasks(prev => {
      switch (type) {
        case 'INSERT':
          // Don't add if task already exists (avoid duplicates)
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
  }, [])

  useTaskUpdates(null, handleTaskChange)

  useEffect(() => {
    // Filter tasks by search query
    const filteredTasks = tasks.filter(task => 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Organize tasks into columns and sort by position
    const newColumns: Column[] = COLUMNS.map(col => ({
      id: col.id,
      title: col.title,
      tasks: filteredTasks
        .filter(task => task.status === col.id)
        .sort((a, b) => (a.position || 0) - (b.position || 0)),
    }))
    
    setColumns(newColumns)
  }, [tasks, searchQuery])

  const loadProjects = async () => {
    try {
      const data = await getProjects()
      setProjects(data)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const loadTasks = async () => {
    try {
      const data = await getTasks(selectedProjectId === 'all' ? undefined : selectedProjectId)
      // Filter out sections - kanban only shows regular tasks
      const regularTasks = getRegularTasks(data)
      setTasks(regularTasks)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    // Determine the new status - over.id could be a column ID or task ID
    let newStatus: TaskStatus
    let newPosition: number | undefined
    
    // Check if we're dropping on a column
    const columnStatuses = ['todo', 'in_progress', 'review', 'done', 'blocked']
    if (columnStatuses.includes(over.id as string)) {
      // Dropped on empty column or column header
      newStatus = over.id as TaskStatus
      // If dropping on empty column, set position to 0
      const columnTasks = tasks.filter(t => t.status === newStatus)
      newPosition = columnTasks.length === 0 ? 0 : Math.max(...columnTasks.map(t => t.position || 0)) + 1
    } else {
      // We're dropping on another task
      const overTask = tasks.find(t => t.id === over.id)
      if (!overTask) return
      newStatus = overTask.status as TaskStatus
      
      // Calculate new position based on the task we're dropping on
      const columnTasks = tasks
        .filter(t => t.status === newStatus && t.id !== taskId)
        .sort((a, b) => (a.position || 0) - (b.position || 0))
      
      const overIndex = columnTasks.findIndex(t => t.id === over.id)
      
      if (task.status === newStatus) {
        // Reordering within the same column
        const oldIndex = columnTasks.findIndex(t => t.id === taskId)
        if (oldIndex === overIndex) return // No change needed
        
        // Update positions for all affected tasks
        let updatedTasks = [...tasks]
        const sortedColumnTasks = tasks
          .filter(t => t.status === newStatus)
          .sort((a, b) => (a.position || 0) - (b.position || 0))
        
        const oldPos = sortedColumnTasks.findIndex(t => t.id === taskId)
        const newPos = sortedColumnTasks.findIndex(t => t.id === over.id)
        
        if (oldPos !== -1 && newPos !== -1) {
          const reorderedTasks = arrayMove(sortedColumnTasks, oldPos, newPos)
          
          // Update positions for all tasks in the column
          reorderedTasks.forEach((t, index) => {
            const taskIndex = updatedTasks.findIndex(ut => ut.id === t.id)
            if (taskIndex !== -1) {
              updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], position: index * 100 }
            }
          })
          
          setTasks(updatedTasks)
          
          // Update the moved task position in the database
          try {
            await updateTask(taskId, { position: newPos * 100 })
          } catch (error) {
            console.error('Failed to update task position:', error)
            loadTasks()
          }
          return
        }
      } else {
        // Moving to a different column
        if (overIndex === -1) {
          // If we can't find the over task, place at the end
          newPosition = columnTasks.length === 0 ? 0 : Math.max(...columnTasks.map(t => t.position || 0)) + 100
        } else {
          // Insert after the task we're dropping on
          const prevTask = columnTasks[overIndex]
          const nextTask = columnTasks[overIndex + 1]
          
          if (nextTask) {
            newPosition = ((prevTask.position || 0) + (nextTask.position || 0)) / 2
          } else {
            newPosition = (prevTask.position || 0) + 100
          }
        }
      }
    }

    // Only update if status changed
    if (task.status !== newStatus) {
      // Optimistic update
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus, position: newPosition ?? null } : t
      ))

      try {
        console.log('Updating task status:', { taskId, newStatus, newPosition })
        await updateTask(taskId, { status: newStatus, position: newPosition })
        console.log('Task status updated successfully')
      } catch (error) {
        console.error('Failed to update task:', error)
        // Revert optimistic update on error
        loadTasks()
      }
    }
  }

  const handleTaskCreated = (newTask: TaskWithDetails) => {
    setTasks(prev => [...prev, newTask])
    setIsCreateDialogOpen(false)
  }

  const handleTaskUpdated = (updatedTask: TaskWithDetails) => {
    setTasks(prev => prev.map(t => 
      t.id === updatedTask.id ? updatedTask : t
    ))
  }

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setSelectedTask(null)
  }

  const handleTaskCloned = (clonedTask: TaskWithDetails) => {
    setTasks(prev => [...prev, clonedTask])
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Tasks</h2>
            <p className="text-muted-foreground">Manage tasks with a Kanban board</p>
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-8 bg-muted rounded animate-pulse"></div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-24 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
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
          <h2 className="text-2xl font-bold">Tasks</h2>
          <p className="text-muted-foreground">Manage tasks with a Kanban board</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative w-full sm:flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-full sm:w-64">
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
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm" className="sm:hidden">
            <Filter className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Total:</span>
            <Badge variant="secondary">{tasks.length} tasks</Badge>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 min-h-[600px] overflow-x-auto">
          {COLUMNS.map((column) => {
            const columnTasks = columns.find(col => col.id === column.id)?.tasks || []
            
            return (
              <div key={column.id} className="min-w-[280px] xl:min-w-0">
                <KanbanColumn 
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  tasks={columnTasks}
                  onTaskClick={setSelectedTask}
                />
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCardOverlay task={activeTask} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Online Status Indicator */}
      <OnlineStatus />

      {/* Dialogs */}
      <CreateTaskDialog 
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTaskCreated={handleTaskCreated}
        projectId={selectedProjectId === 'all' ? undefined : selectedProjectId}
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