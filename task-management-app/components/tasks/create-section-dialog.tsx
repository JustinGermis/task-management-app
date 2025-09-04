'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createTask } from '@/lib/api/simple-api'
import { TaskWithDetails } from '@/lib/types'

interface CreateSectionDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSectionCreated: (section: TaskWithDetails) => void
  projectId: string
  parentSectionId?: string
}

export function CreateSectionDialog({ 
  isOpen, 
  onOpenChange, 
  onSectionCreated, 
  projectId,
  parentSectionId 
}: CreateSectionDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!formData.title.trim()) {
      setError('Section title is required')
      setIsLoading(false)
      return
    }

    try {
      // Create section as a task with special properties
      const section = await createTask({
        title: `📁 ${formData.title}`, // Prefix with folder emoji to identify as section
        description: formData.description || undefined,
        project_id: projectId,
        parent_task_id: parentSectionId,
        status: 'todo', // Sections default to todo but this is largely ignored
        priority: 'medium', // Default priority, largely ignored for sections
      })

      // Create a full section object for the UI
      const fullSection: TaskWithDetails = {
        ...section,
        assignees: [],
        comments: [],
        labels: [],
      }

      onSectionCreated(fullSection)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
      })
      
      setIsLoading(false)
      onOpenChange(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create section')
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{parentSectionId ? 'Create Subsection' : 'Create Section'}</DialogTitle>
          <DialogDescription>
            {parentSectionId 
              ? 'Add a subsection to organize tasks within this section'
              : 'Create a new section to organize and group related tasks'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Section Name</Label>
            <Input
              id="title"
              name="title"
              placeholder="Enter section name"
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
              placeholder="Describe what this section is for..."
              value={formData.description}
              onChange={handleChange}
              disabled={isLoading}
              rows={3}
            />
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
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Create Section'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}