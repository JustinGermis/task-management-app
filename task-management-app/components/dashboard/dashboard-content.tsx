'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plus,
  ArrowRight,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { getDashboardStats, getRecentTasks, getRecentProjects, createSampleNotifications } from '@/lib/api/simple-api'
import { formatRelativeTime } from '@/lib/utils'

interface DashboardContentProps {
  userName: string
}

export function DashboardContent({ userName }: DashboardContentProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    todoTasks: 0,
    overdueTasks: 0,
    totalProjects: 0,
    activeProjects: 0,
    teamMembers: 0,
  })
  const [recentTasks, setRecentTasks] = useState<any[]>([])
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [isCreatingNotifications, setIsCreatingNotifications] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, tasksData, projectsData] = await Promise.all([
        getDashboardStats(),
        getRecentTasks(5),
        getRecentProjects(3),
      ])

      if (statsData) {
        setStats(statsData)
      }
      setRecentTasks(tasksData)
      setRecentProjects(projectsData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'done': return 'default'
      case 'in_progress': return 'secondary'
      case 'todo': return 'outline'
      default: return 'outline'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const handleCreateSampleNotifications = async () => {
    setIsCreatingNotifications(true)
    try {
      await createSampleNotifications()
      alert('Sample notifications created! Check the notifications bell.')
    } catch (error) {
      alert('Failed to create notifications. Check console for details.')
    } finally {
      setIsCreatingNotifications(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Test Notifications Button - Remove this after testing */}
      <div className="p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground mb-2">Testing:</p>
        <Button 
          onClick={handleCreateSampleNotifications}
          disabled={isCreatingNotifications}
          variant="outline"
          size="sm"
        >
          {isCreatingNotifications ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Create Sample Notifications
        </Button>
      </div>

      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {userName}!
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your projects today.
        </p>
      </div>

      {/* Critical Metrics - PM Focus */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={stats.overdueTasks > 0 ? "border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className={`h-4 w-4 ${stats.overdueTasks > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.overdueTasks > 0 ? 'text-destructive' : ''}`}>
              {stats.overdueTasks}
            </div>
            <p className="text-xs text-muted-foreground">
              Need immediate attention
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgressTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todoTasks} ready to start
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTasks} of {stats.totalTasks} tasks done
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalProjects > stats.activeProjects ? `${stats.totalProjects - stats.activeProjects} completed` : 'All projects active'}
            </p>
          </CardContent>
        </Card>
      </div>

      {stats.overdueTasks > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-sm font-medium">
                You have {stats.overdueTasks} overdue task{stats.overdueTasks !== 1 ? 's' : ''}
              </CardTitle>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/tasks?filter=overdue">View Tasks</Link>
            </Button>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tasks - Enhanced */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recent Tasks</CardTitle>
                  <CardDescription>Your latest task updates</CardDescription>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="hover:bg-white/50 dark:hover:bg-black/20" asChild>
                <Link href="/tasks">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentTasks.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">No tasks yet. Create your first task to get started.</p>
                <Button asChild>
                  <Link href="/tasks">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {recentTasks.map((task, index) => (
                    <div key={task.id} className="p-4 hover:bg-muted/50 transition-colors group">
                      <div className="flex items-start justify-between space-x-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                              {task.title}
                            </h4>
                            {task.priority && (
                              <Badge 
                                variant={getPriorityVariant(task.priority)}
                                className="text-xs font-medium"
                              >
                                {task.priority}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{task.project?.name || 'No project'}</span>
                            {task.due_date && (
                              <>
                                <span>•</span>
                                <span>Due {formatRelativeTime(task.due_date)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={getStatusVariant(task.status)}
                          className="text-xs font-medium shrink-0"
                        >
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-muted/30 border-t">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/tasks" className="flex items-center">
                      <Plus className="mr-2 h-4 w-4" />
                      Add new task
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Active Projects - Enhanced */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Active Projects</CardTitle>
                  <CardDescription>Project progress overview</CardDescription>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="hover:bg-white/50 dark:hover:bg-black/20" asChild>
                <Link href="/projects">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentProjects.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">No projects yet. Create your first project to get started.</p>
                <Button asChild>
                  <Link href="/projects">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {recentProjects.map((project) => (
                    <div key={project.id} className="p-4 hover:bg-muted/50 transition-colors group">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                {project.name}
                              </h4>
                              <Badge 
                                variant={project.status === 'active' ? 'default' : 'secondary'}
                                className="text-xs font-medium"
                              >
                                {project.status}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <span>{project.members} member{project.members !== 1 ? 's' : ''}</span>
                              {project.due_date && (
                                <>
                                  <span>•</span>
                                  <span>Due {formatRelativeTime(project.due_date)}</span>
                                </>
                              )}
                              {!project.due_date && (
                                <>
                                  <span>•</span>
                                  <span>No due date</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              {project.progress}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              complete
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                              {project.completedTasks}/{project.totalTasks} tasks
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-muted/30 border-t">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/projects" className="flex items-center">
                      <Plus className="mr-2 h-4 w-4" />
                      Create new project
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Priority Actions - Enhanced */}
      <Card className="overflow-hidden border-2 border-dashed border-primary/20">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Priority Actions</CardTitle>
              <CardDescription>What requires your immediate attention</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {stats.overdueTasks > 0 && (
              <div className="relative">
                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-destructive rounded-full"></div>
                <Button variant="destructive" className="w-full justify-start" asChild>
                  <Link href="/tasks?filter=overdue" className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Review {stats.overdueTasks} overdue task{stats.overdueTasks !== 1 ? 's' : ''}
                  </Link>
                </Button>
              </div>
            )}
            
            {stats.totalProjects === 0 ? (
              <Button className="w-full justify-start" asChild>
                <Link href="/organizations" className="flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first organization
                </Link>
              </Button>
            ) : (
              <Button className="w-full justify-start" asChild>
                <Link href="/tasks" className="flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  Add task
                </Link>
              </Button>
            )}
            
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/projects" className="flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  New project
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/team" className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Invite member
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}