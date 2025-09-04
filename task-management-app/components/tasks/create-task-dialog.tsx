'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { createTask, getProjects, getTasks } from '@/lib/api/simple-api'
import { TaskWithDetails, ProjectWithDetails, TaskPriority } from '@/lib/types'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants'
import { getSections, getSectionDisplayName } from '@/lib/task-utils'
import { cn } from '@/lib/utils'

interface CreateTaskDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreated: (task: TaskWithDetails) => void
  projectId?: string
  parentTaskId?: string
  defaultStatus?: string
}

export function CreateTaskDialog({ 
  isOpen, 
  onOpenChange, 
  onTaskCreated, 
  projectId,
  parentTaskId,
  defaultStatus 
}: CreateTaskDialogProps) {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [sections, setSections] = useState<TaskWithDetails[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    due_date: '',
    project_id: projectId || '',
    section_id: parentTaskId || 'no_section',
    status: defaultStatus || 'todo',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadProjects()
      if (projectId) {
        setFormData(prev => ({ 
          ...prev, 
          project_id: projectId,
          section_id: parentTaskId || 'no_section',
          status: defaultStatus || 'todo'
        }))
        loadSections(projectId)
      } else if (defaultStatus) {
        setFormData(prev => ({ 
          ...prev, 
          status: defaultStatus
        }))
      }
    }
  }, [isOpen, projectId, parentTaskId, defaultStatus])

  const loadProjects = async () => {
    try {
      const data = await getProjects()
      setProjects(data)
      
      // If no project selected and only one project, select it
      if (!projectId && data.length === 1) {
        setFormData(prev => ({ ...prev, project_id: data[0].id }))
        loadSections(data[0].id)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const loadSections = async (selectedProjectId: string) => {
    try {
      const tasks = await getTasks(selectedProjectId)
      const projectSections = getSections(tasks)
      setSections(projectSections)
    } catch (error) {
      console.error('Failed to load sections:', error)
      setSections([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!formData.project_id) {
      setError('Please select a project')
      setIsLoading(false)
      return
    }

    try {
      const task = await createTask({
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        due_date: formData.due_date || undefined,
        project_id: formData.project_id,
        parent_task_id: formData.section_id === 'no_section' ? undefined : formData.section_id,
        status: formData.status,
      })

      // Create a full task object for the UI
      const fullTask: TaskWithDetails = {
        ...task,
        assignees: [],
        comments: [],
        labels: [],
        project: projects.find(p => p.id === formData.project_id),
      }

      onTaskCreated(fullTask)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        project_id: projectId || '',
        section_id: 'no_section',
        status: 'todo',
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create task')
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
    
    // If project changes, reload sections and clear section selection
    if (name === 'project_id') {
      loadSections(value)
      setFormData(prev => ({
        ...prev,
        section_id: 'no_section',
      }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{parentTaskId ? 'Create Subtask' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {parentTaskId 
              ? 'Add a subtask to break down work into smaller pieces'
              : 'Add a new task to track work and collaborate with your team'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Enter task title"
              value={formData.title}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe the task..."
              value={formData.description}
              onChange={handleChange}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={handleSelectChange('priority')}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((priority) => (
                    <SelectItem key={priority.id} value={priority.id}>
                      <span className={priority.color}>{priority.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={handleSelectChange('status')}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                        <span>{status.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.due_date && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? (
                      format(new Date(formData.due_date), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.due_date ? new Date(formData.due_date) : undefined}
                    onSelect={(date) => {
                      setFormData(prev => ({
                        ...prev,
                        due_date: date ? format(date, 'yyyy-MM-dd') : ''
                      }))
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_id">Project</Label>
            <Select 
              value={formData.project_id} 
              onValueChange={handleSelectChange('project_id')}
              disabled={isLoading || !!projectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color || '#6b7280' }}
                      />
                      <span>{project.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projects.length === 0 && (
              <p className="text-sm text-muted-foreground">
                You need to be a member of a project to create tasks.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="section_id">Section (Optional)</Label>
            <Select 
              value={formData.section_id} 
              onValueChange={handleSelectChange('section_id')}
              disabled={isLoading || !formData.project_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select section or leave empty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_section">No section</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    <div className="flex items-center space-x-2">
                      <span>📁</span>
                      <span>{getSectionDisplayName(section)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sections.length === 0 && formData.project_id && (
              <p className="text-sm text-muted-foreground">
                No sections available. Create sections first to organize tasks.
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || projects.length === 0}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Create Task'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}