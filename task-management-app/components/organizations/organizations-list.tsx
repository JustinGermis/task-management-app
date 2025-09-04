'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Building, Users, Calendar, Settings, Trash2 } from 'lucide-react'
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
import { getOrganizations } from '@/lib/api/organizations-simple'
import { deleteOrganization } from '@/lib/api/organizations'
import { OrganizationWithDetails } from '@/lib/types'
import { formatDate, pluralize } from '@/lib/utils'

export function OrganizationsList() {
  const [organizations, setOrganizations] = useState<OrganizationWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      const data = await getOrganizations()
      setOrganizations(data)
    } catch (error) {
      console.error('Failed to load organizations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization?')) return
    
    try {
      await deleteOrganization(id)
      setOrganizations(organizations.filter(org => org.id !== id))
    } catch (error) {
      console.error('Failed to delete organization:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Organizations</h2>
            <p className="text-muted-foreground">Manage your organizations and teams</p>
          </div>
          <Button disabled className="opacity-50">
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Organizations</h2>
          <p className="text-muted-foreground">Manage your organizations and teams</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/organizations/new">
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Link>
        </Button>
      </div>

      {organizations.length === 0 ? (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Get Started</CardTitle>
                <CardDescription>Create your first organization to begin managing teams</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-center py-12 px-6">
              <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">No organizations yet. Create your first organization to start managing projects and teams.</p>
              <Button asChild>
                <Link href="/organizations/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Organization
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((organization) => (
            <Card key={organization.id} className="hover:shadow-lg transition-all duration-200 group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      <Link href={`/organizations/${organization.id}`} className="hover:underline">
                        {organization.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {organization.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/organizations/${organization.id}/edit`}>
                          Edit Organization
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/organizations/${organization.id}/members`}>
                          Manage Members
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(organization.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{pluralize(organization.members?.length || 0, 'member')}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(organization.created_at!)}</span>
                  </div>
                </div>
                
                {organization.projects && organization.projects.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Recent Projects</p>
                    <div className="space-y-1">
                      {organization.projects.slice(0, 2).map((project) => (
                        <div key={project.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{project.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {project.status}
                          </Badge>
                        </div>
                      ))}
                      {organization.projects.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{organization.projects.length - 2} more projects
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full group-hover:border-primary/50 transition-colors" asChild>
                    <Link href={`/organizations/${organization.id}`}>
                      View details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}