'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Folder, Calendar, Users, MoreVertical, Trash2, ArrowRight, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getProjects, deleteProject, getOrganizations } from '@/lib/api/simple-api'
import { formatDate } from '@/lib/utils'

export function ProjectsList({ organizationId: initialOrgId }: { organizationId?: string }) {
  const [projects, setProjects] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadOrganizations()
  }, [])

  useEffect(() => {
    if (initialOrgId) {
      setSelectedOrgId(initialOrgId)
    }
  }, [initialOrgId])

  useEffect(() => {
    loadProjects()
  }, [selectedOrgId])

  const loadOrganizations = async () => {
    try {
      const data = await getOrganizations()
      setOrganizations(data)
    } catch (error) {
      console.error('Failed to load organizations:', error)
    }
  }

  const loadProjects = async () => {
    try {
      const orgId = selectedOrgId === 'all' ? undefined : selectedOrgId
      const data = await getProjects(orgId)
      setProjects(data)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return

    try {
      await deleteProject(projectId)
      await loadProjects()
    } catch (error) {
      console.error('Failed to delete project:', error)
      alert('Failed to delete project. You may not have permission.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-gray-500'
      case 'active': return 'bg-green-500'
      case 'on_hold': return 'bg-yellow-500'
      case 'completed': return 'bg-blue-500'
      case 'archived': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
            <p className="text-muted-foreground">Manage your projects and tasks</p>
          </div>
          <Button disabled className="opacity-50 flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-full mt-2"></div>
                <div className="h-3 bg-muted rounded w-2/3 mt-2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
            <p className="text-muted-foreground">Manage your projects and tasks</p>
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/projects/new" className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Get Started</CardTitle>
                <CardDescription>Create your first project to begin organizing tasks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-center py-12 px-6">
              <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">No projects yet. Create your first project to start managing tasks.</p>
              <Button asChild>
                <Link href="/projects/new" className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">Manage your projects and tasks</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {organizations.length > 1 && (
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organizations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/projects/new" className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Card key={project.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Link href={`/projects/${project.id}`}>
                  <CardTitle className="hover:underline">{project.name}</CardTitle>
                </Link>
                <CardDescription className="mt-1">
                  {project.description || 'No description'}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/projects/${project.id}`}>View Details</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/projects/${project.id}/edit`}>Edit</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(project.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <Badge className={`${getStatusColor(project.status)} text-white`}>
                {project.status}
              </Badge>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="mr-1 h-3 w-3" />
              Created {formatDate(project.created_at)}
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  )
}