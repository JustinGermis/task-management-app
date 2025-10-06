'use client'

import { useState, useEffect } from 'react'
import { LayoutGrid, List, Network } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from './kanban-board'
import { ProjectListView } from './project-list-view'
import { HierarchicalListView } from './hierarchical-list-view'

type ViewMode = 'kanban' | 'list' | 'hierarchy'

const VIEW_MODE_KEY = 'tasks:viewMode'

export function TasksPageContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')

  // Load view mode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY)
    if (saved && ['kanban', 'list', 'hierarchy'].includes(saved)) {
      setViewMode(saved as ViewMode)
    }
  }, [])

  // Save view mode to localStorage when it changes
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_KEY, mode)
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg">
          <Button
            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleViewModeChange('kanban')}
            className="flex items-center space-x-2"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Kanban</span>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleViewModeChange('list')}
            className="flex items-center space-x-2"
          >
            <List className="h-4 w-4" />
            <span>List</span>
          </Button>
          <Button
            variant={viewMode === 'hierarchy' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleViewModeChange('hierarchy')}
            className="flex items-center space-x-2"
          >
            <Network className="h-4 w-4" />
            <span>Structure</span>
          </Button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'kanban' ? (
        <KanbanBoard />
      ) : viewMode === 'list' ? (
        <ProjectListView />
      ) : (
        <HierarchicalListView />
      )}
    </div>
  )
}