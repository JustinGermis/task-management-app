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
  useSensors
} from '@dnd-kit/core'
import { 
  SortableContext, 
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates 
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Search, ChevronDown, ChevronRight, MoreVertical, Calendar, User, Flag, FolderPlus, FileText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreateTaskDialog } from './create-task-dialog'
import { CreateSectionDialog } from './create-section-dialog'
import { TaskDetailsEnhanced } from './task-details-enhanced'
import { OnlineStatus } from '@/components/shared/online-status'
import { getTasks, updateTask, getProjects, createTask } from '@/lib/api/simple-api'
import { useTaskUpdates } from '@/lib/hooks/use-realtime'
import { TaskWithDetails, Project } from '@/lib/types'
import { TASK_PRIORITIES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { isSection, getSectionDisplayName, getRegularTasks } from '@/lib/task-utils'
import { useDataCache } from '@/lib/contexts/data-cache-context'

interface HierarchicalListViewProps {
  projectId?: string
}

const CACHE_KEYS = {
  PROJECTS: 'tasks:projects', // Shared across all views
  TASKS: (projectId: string) => `tasks:data:${projectId}`, // Shared across all views
}

const DROPDOWN_KEY = 'tasks:selectedProjectId' // Shared across all views

interface TaskTreeNode extends TaskWithDetails {
  children: TaskTreeNode[]
  level: number
}

interface DraggableTaskRowProps {
  node: TaskTreeNode
  onTaskClick: (task: TaskWithDetails) => void
  onCreateSubtask: (parentId: string) => void
  onCreateSubsection: (parentId: string) => void
  onTaskDelete: (taskId: string) => void
  onToggleExpansion: (taskId: string) => void
  isExpanded: boolean
  children?: React.ReactNode
}

function DraggableTaskRow({ 
  node, 
  onTaskClick, 
  onCreateSubtask, 
  onCreateSubsection, 
  onTaskDelete, 
  onToggleExpansion,
  isExpanded,
  children 
}: DraggableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: node.id,
    disabled: isSection(node), // Disable dragging for sections
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const hasChildren = node.children.length > 0
  const indentLevel = node.level * 32 // Increased from 24px to 32px for better visual separation

  const getPriorityColor = (priority: string) => {
    const priorityConfig = TASK_PRIORITIES.find(p => p.id === priority)
    return priorityConfig?.color || 'text-gray-500'
  }

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'todo': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      'in_progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'review': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'done': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      'blocked': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    }
    return statusColors[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }

  // Get styling based on hierarchy level
  const getLevelStyling = () => {
    if (isSection(node)) {
      if (node.level === 0) {
        // Top-level sections - more prominent
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20',
          border: 'border-l-4 border-l-blue-500',
          hover: 'hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30',
          text: 'text-blue-900 dark:text-blue-100',
          icon: 'text-blue-600 dark:text-blue-400',
          rounded: 'rounded-lg'
        }
      } else {
        // Subsections - secondary prominence
        return {
          bg: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/15 dark:to-teal-950/15',
          border: 'border-l-3 border-l-emerald-500',
          hover: 'hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/25 dark:hover:to-teal-900/25',
          text: 'text-emerald-900 dark:text-emerald-100',
          icon: 'text-emerald-600 dark:text-emerald-400',
          rounded: 'rounded-md'
        }
      }
    } else {
      // Regular tasks - subtle styling
      return {
        bg: 'bg-white dark:bg-slate-900',
        border: 'border-l-2 border-l-slate-300 dark:border-l-slate-600',
        hover: 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
        text: 'text-slate-900 dark:text-slate-100',
        icon: 'text-slate-500 dark:text-slate-400',
        rounded: 'rounded-sm'
      }
    }
  }

  const levelStyle = getLevelStyling()

  return (
    <>
      <div 
        ref={setNodeRef}
        style={style}
        className={`
          relative group border-b border-border/30 last:border-b-0 
          ${levelStyle.bg} ${levelStyle.border} ${levelStyle.rounded}
          ${isDragging ? 'shadow-lg ring-2 ring-blue-500/20 scale-[1.02]' : 'shadow-sm'}
          transition-all duration-200 ease-in-out
          ${levelStyle.hover}
        `}
      >
        {/* Visual connector lines for hierarchy */}
        {node.level > 0 && (
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700" 
               style={{ left: `${12 + (node.level - 1) * 32}px` }} />
        )}
        
        <div 
          className={`flex items-center gap-3 py-4 px-4 relative z-10`}
          style={{ paddingLeft: `${16 + indentLevel}px` }}
          {...attributes}
          {...listeners}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={() => onToggleExpansion(node.id)}
            className={`
              p-2 rounded-full transition-all duration-200 
              ${hasChildren ? 'visible opacity-100' : 'invisible opacity-0'}
              ${hasChildren ? 'hover:bg-white/60 dark:hover:bg-slate-700/60 hover:shadow-md' : ''}
              ${isExpanded ? 'bg-white/80 dark:bg-slate-700/80 shadow-sm' : ''}
            `}
          >
            <ChevronRight className={`
              h-4 w-4 transition-transform duration-200 ${levelStyle.icon}
              ${isExpanded ? 'rotate-90' : 'rotate-0'}
            `} />
          </button>

          {/* Enhanced Icon with level-appropriate styling */}
          <div className={`shrink-0 p-2 rounded-lg ${
            isSection(node) 
              ? 'bg-white/60 dark:bg-slate-700/60 shadow-sm' 
              : 'bg-slate-100/60 dark:bg-slate-800/60'
          }`}>
            {isSection(node) ? (
              node.level === 0 ? (
                <FolderPlus className={`h-5 w-5 ${levelStyle.icon}`} />
              ) : (
                <FolderPlus className={`h-4 w-4 ${levelStyle.icon}`} />
              )
            ) : (
              <FileText className={`h-4 w-4 ${levelStyle.icon}`} />
            )}
          </div>

          {/* Task Content with enhanced typography */}
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <button
                onClick={() => onTaskClick(node)}
                className={`
                  text-left font-medium hover:underline truncate block w-full transition-colors
                  ${levelStyle.text}
                  ${isSection(node) ? (node.level === 0 ? 'text-lg' : 'text-base') : 'text-sm'}
                `}
              >
                {isSection(node) ? getSectionDisplayName(node) : node.title}
              </button>
              
              {node.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1 italic">
                  {node.description}
                </p>
              )}

              {/* Enhanced task metadata */}
              {!isSection(node) && (
                <div className="flex items-center gap-3 mt-3">
                  <Badge className={`text-xs font-medium ${getStatusColor(node.status || 'todo')} border-0`}>
                    {node.status || 'todo'}
                  </Badge>
                  
                  <Badge 
                    variant="outline" 
                    className={`${getPriorityColor(node.priority || 'medium')} border-current text-xs font-medium`}
                  >
                    <Flag className="w-3 h-3 mr-1" />
                    {node.priority}
                  </Badge>

                  {node.due_date && (
                    <div className="flex items-center text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-full">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span className="font-medium">{formatDate(node.due_date)}</span>
                    </div>
                  )}
                  
                  {/* Assignees */}
                  {node.assignees && node.assignees.length > 0 && (
                    <div className="flex items-center -space-x-1">
                      {node.assignees.slice(0, 3).map((assignee: any) => {
                        const isAutoAssigned = node.metadata?.autoAssigned && 
                                             node.metadata?.assignedEmail === assignee.profiles?.email
                        const initials = assignee.profiles?.full_name
                          ? assignee.profiles.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                          : assignee.profiles?.email?.slice(0, 2).toUpperCase() || 'U'
                        
                        return (
                          <div key={assignee.id} className="relative">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 border-background ${
                              isAutoAssigned ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-500' : 'bg-muted text-muted-foreground'
                            }`}>
                              {initials}
                            </div>
                            {isAutoAssigned && (
                              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full border border-background" />
                            )}
                          </div>
                        )
                      })}
                      {node.assignees.length > 3 && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-muted text-muted-foreground border-2 border-background">
                          +{node.assignees.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Show children count for collapsed sections */}
              {isSection(node) && hasChildren && !isExpanded && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {node.children.length} {node.children.length === 1 ? 'item' : 'items'}
                </Badge>
              )}
            </div>

            {/* Enhanced Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/80 dark:hover:bg-slate-700/80"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onTaskClick(node)}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {isSection(node) ? (
                  <>
                    <DropdownMenuItem onClick={() => onCreateSubsection(node.id)}>
                      <FolderPlus className="mr-2 h-4 w-4" />
                      Add Subsection
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCreateSubtask(node.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Task
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => onCreateSubtask(node.id)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Subtask
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onTaskDelete(node.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Children container with enhanced spacing */}
      {children && (
        <div className="relative">
          {children}
        </div>
      )}
    </>
  )
}

export function HierarchicalListView({ projectId }: HierarchicalListViewProps) {
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
  const [isCreateSectionDialogOpen, setIsCreateSectionDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [createParentId, setCreateParentId] = useState<string | undefined>()
  const [createSectionParentId, setCreateSectionParentId] = useState<string | undefined>()
  const [activeTask, setActiveTask] = useState<TaskWithDetails | null>(null)

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
    if (!projectId) {
      loadProjects()
    }
    loadTasks()
  }, [projectId])

  // Listen for cache updates from other views
  useEffect(() => {
    const handleCacheUpdate = (event: CustomEvent) => {
      const { key, data } = event.detail
      const effectiveProjectId = projectId || selectedProjectId
      // If tasks cache for our project was updated, use the data from the event
      if (effectiveProjectId && key === CACHE_KEYS.TASKS(effectiveProjectId) && data) {
        setTasks(data)
      }
    }

    window.addEventListener('cache-updated', handleCacheUpdate as EventListener)
    return () => window.removeEventListener('cache-updated', handleCacheUpdate as EventListener)
  }, [selectedProjectId, projectId])

  useEffect(() => {
    loadTasks()
    // Save selection to localStorage (only if not passed as prop)
    if (!projectId && selectedProjectId) {
      localStorage.setItem(DROPDOWN_KEY, selectedProjectId)
    }
  }, [selectedProjectId])

  // Helper to update both state and cache
  const updateTasksAndCache = (updater: (prev: TaskWithDetails[]) => TaskWithDetails[]) => {
    setTasks(prev => {
      const newTasks = updater(prev)
      // Update cache with new state
      const effectiveProjectId = projectId || selectedProjectId
      if (effectiveProjectId) {
        console.log('[Structure] Updating cache for project:', effectiveProjectId, 'tasks:', newTasks.length)
        cache.set(CACHE_KEYS.TASKS(effectiveProjectId), newTasks)

        // Also update the "all" cache if it exists so other views see the change
        const allCacheKey = CACHE_KEYS.TASKS('all')
        const allCache = cache.get(allCacheKey)
        console.log('[Structure] Checking for "all" cache:', allCacheKey, 'exists:', !!allCache)
        if (allCache) {
          console.log('[Structure] "all" cache exists with', allCache.length, 'tasks, updating...')
          console.log('[Structure] newTasks count:', newTasks.length, 'IDs:', newTasks.map(t => t.id))
          console.log('[Structure] allCache IDs:', allCache.map((t: TaskWithDetails) => t.id))

          // Update the task in the "all" cache too
          const updatedAllCache = allCache.map((t: TaskWithDetails) => {
            const updated = newTasks.find((nt: TaskWithDetails) => nt.id === t.id)
            if (updated && t.id === updated.id && t.status !== updated.status) {
              console.log('[Structure] Updating task in "all" cache:', t.id, 'status:', t.status, '->', updated.status)
            }
            return updated || t
          })
          console.log('[Structure] Setting updated "all" cache with', updatedAllCache.length, 'tasks')
          cache.set(allCacheKey, updatedAllCache)
        } else {
          console.log('[Structure] "all" cache does not exist, skipping cross-cache update')
        }
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
  }, [selectedProjectId, projectId, cache, updateTasksAndCache])

  useTaskUpdates(selectedProjectId || null, handleTaskChange)

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
      if (!selectedProjectId) {
        if (data.length > 0) {
          setSelectedProjectId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const loadTasks = async () => {
    const effectiveProjectId = projectId || selectedProjectId
    if (!effectiveProjectId) {
      setTasks([])
      setIsLoading(false)
      return
    }

    const cacheKey = CACHE_KEYS.TASKS(effectiveProjectId)

    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && !cache.isStale(cacheKey)) {
      setTasks(cached)
      setIsLoading(false)
      return
    }

    try {
      const data = await getTasks(effectiveProjectId)
      setTasks(data)
      cache.set(cacheKey, data)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskCreated = (newTask: TaskWithDetails) => {
    updateTasksAndCache(prev => [...prev, newTask])
    setIsCreateDialogOpen(false)
    setCreateParentId(undefined)
  }

  const handleSectionCreated = (newSection: TaskWithDetails) => {
    updateTasksAndCache(prev => [...prev, newSection])
    setIsCreateSectionDialogOpen(false)
    setCreateSectionParentId(undefined)
  }

  const handleTaskUpdated = (updatedTask: TaskWithDetails) => {
    console.log('[Structure] handleTaskUpdated called:', updatedTask.id, 'status:', updatedTask.status)
    updateTasksAndCache(prev => {
      const updated = prev.map(t =>
        t.id === updatedTask.id ? updatedTask : t
      )
      console.log('[Structure] Updated tasks in cache, count:', updated.length)
      return updated
    })
    // Also update the selectedTask if it's the one being updated
    if (selectedTask && selectedTask.id === updatedTask.id) {
      console.log('[Structure] Updating selectedTask with new data')
      setSelectedTask(updatedTask)
    }
  }

  const handleTaskDeleted = (taskId: string) => {
    updateTasksAndCache(prev => prev.filter(t => t.id !== taskId))
    setSelectedTask(null)
  }

  const handleTaskCloned = (clonedTask: TaskWithDetails) => {
    updateTasksAndCache(prev => [...prev, clonedTask])
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

  const handleCreateSubtask = (parentId: string) => {
    setCreateParentId(parentId)
    setIsCreateDialogOpen(true)
  }

  const handleCreateSection = (parentSectionId?: string) => {
    setCreateSectionParentId(parentSectionId)
    setIsCreateSectionDialogOpen(true)
  }

  const handleCreateSubsection = (parentSectionId: string) => {
    setCreateSectionParentId(parentSectionId)
    setIsCreateSectionDialogOpen(true)
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
    if (!task || isSection(task)) return // Don't allow dragging sections

    const overId = over.id as string
    const overTask = tasks.find(t => t.id === overId)
    
    let newParentId: string | null = null

    // Determine new parent based on what we're dropping on
    if (overTask) {
      if (isSection(overTask)) {
        // Dropping on a section - make it the parent
        newParentId = overId
      } else if (overTask.parent_task_id) {
        // Dropping on a task that's in a section - use same parent
        newParentId = overTask.parent_task_id
      } else {
        // Dropping on a top-level task - remove from section
        newParentId = null
      }
    }

    // Validate: prevent circular references
    if (newParentId && isDescendant(newParentId, taskId, tasks)) {
      console.warn('Cannot create circular reference: task cannot be parent of its ancestor')
      return
    }

    // Only update if parent actually changed
    if (task.parent_task_id !== newParentId) {
      // Optimistic update - update both state and cache
      updateTasksAndCache(prev => prev.map(t =>
        t.id === taskId ? { ...t, parent_task_id: newParentId } : t
      ))

      try {
        await updateTask(taskId, { parent_task_id: newParentId })
      } catch (error) {
        console.error('Failed to update task:', error)
        // Revert optimistic update
        loadTasks()
      }
    }
  }

  // Helper function to check if parentId is a descendant of taskId
  const isDescendant = (parentId: string, taskId: string, allTasks: TaskWithDetails[]): boolean => {
    const parentTask = allTasks.find(t => t.id === parentId)
    if (!parentTask) return false
    
    if (parentTask.parent_task_id === taskId) return true
    if (parentTask.parent_task_id) {
      return isDescendant(parentTask.parent_task_id, taskId, allTasks)
    }
    
    return false
  }

  const getPriorityColor = (priority: string) => {
    const priorityConfig = TASK_PRIORITIES.find(p => p.id === priority)
    return priorityConfig?.color || 'text-gray-500'
  }

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'todo': 'bg-gray-100 text-gray-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'review': 'bg-purple-100 text-purple-800',
      'done': 'bg-green-100 text-green-800',
      'blocked': 'bg-red-100 text-red-800',
    }
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  // Build task tree from flat array
  const buildTaskTree = (tasks: TaskWithDetails[]): TaskTreeNode[] => {
    const taskMap = new Map<string, TaskTreeNode>()
    const rootTasks: TaskTreeNode[] = []

    // First pass: create all nodes
    tasks.forEach(task => {
      taskMap.set(task.id, {
        ...task,
        children: [],
        level: 0
      })
    })

    // Second pass: build tree structure
    tasks.forEach(task => {
      const node = taskMap.get(task.id)!
      if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
        const parent = taskMap.get(task.parent_task_id)!
        node.level = parent.level + 1
        parent.children.push(node)
      } else {
        rootTasks.push(node)
      }
    })

    return rootTasks
  }

  // Filter tasks by search query
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const taskTree = buildTaskTree(filteredTasks)

  const currentProject = projects.find(p => p.id === (projectId || selectedProjectId))

  const renderTaskNode = (node: TaskTreeNode): React.ReactNode => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedTasks.has(node.id)

    return (
      <DraggableTaskRow
        key={node.id}
        node={node}
        onTaskClick={(task) => {
          console.log('HierarchicalListView - Task clicked:', {
            id: task.id,
            title: task.title,
            metadata: task.metadata,
            hasMetadata: !!task.metadata,
            metadataKeys: task.metadata ? Object.keys(task.metadata) : []
          })
          setSelectedTask(task)
        }}
        onCreateSubtask={handleCreateSubtask}
        onCreateSubsection={handleCreateSubsection}
        onTaskDelete={handleTaskDeleted}
        onToggleExpansion={toggleTaskExpansion}
        isExpanded={isExpanded}
      >
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTaskNode(child))}
          </div>
        )}
      </DraggableTaskRow>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Project Structure</h2>
            <p className="text-muted-foreground">Hierarchical view with sections and subsections</p>
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
            {currentProject ? `${currentProject.name} Structure` : 'Project Structure'}
          </h2>
          <p className="text-muted-foreground">Hierarchical view with sections and subsections</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleCreateSection()} 
            variant="outline"
            disabled={!selectedProjectId && !projectId}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={!selectedProjectId && !projectId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
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
        {!projectId && (
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">Total:</span>
          <Badge variant="secondary">{filteredTasks.length} tasks</Badge>
        </div>
      </div>

      {/* Hierarchical Task List */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-2">
          {taskTree.length > 0 ? (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart} 
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={tasks.map(task => task.id)} 
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {taskTree.map(node => renderTaskNode(node))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeTask ? (
                  <div className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg shadow-xl p-4 ring-2 ring-blue-500/20">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {isSection(activeTask) ? getSectionDisplayName(activeTask) : activeTask.title}
                    </div>
                    {activeTask.description && (
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 italic">
                        {activeTask.description}
                      </div>
                    )}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <FolderPlus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {!selectedProjectId && !projectId ? 'Select a project' : 'No tasks found'}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {!selectedProjectId && !projectId 
                  ? 'Choose a project to view its hierarchical structure'
                  : searchQuery 
                    ? 'Try adjusting your search criteria'
                    : 'Create your first section or task to get started'
                }
              </p>
              {!searchQuery && (selectedProjectId || projectId) && (
                <div className="flex gap-2">
                  <Button onClick={() => handleCreateSection()} variant="outline">
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Add Section
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Online Status Indicator */}
      <OnlineStatus />

      {/* Dialogs */}
      <CreateTaskDialog 
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTaskCreated={handleTaskCreated}
        projectId={projectId || selectedProjectId}
        parentTaskId={createParentId}
      />
      
      <CreateSectionDialog 
        isOpen={isCreateSectionDialogOpen}
        onOpenChange={setIsCreateSectionDialogOpen}
        onSectionCreated={handleSectionCreated}
        projectId={projectId || selectedProjectId || ''}
        parentSectionId={createSectionParentId}
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