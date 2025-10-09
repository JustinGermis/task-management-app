// Simplified API functions without complex joins to avoid Supabase query issues
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/types'

// ============= ORGANIZATIONS =============
export async function getOrganizations() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  try {
    // Get user's organization memberships
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)

    if (!memberships || memberships.length === 0) return []

    // Get organizations
    const orgIds = memberships.map(m => m.organization_id)
    const { data: orgs } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds)
      .order('created_at', { ascending: false })

    return orgs || []
  } catch (error) {
    console.error('Failed to get organizations:', error)
    return []
  }
}

export async function createOrganization(data: { name: string; description?: string }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  try {
    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: data.name,
        description: data.description,
        created_by: user.id,
      })
      .select()
      .single()

    if (orgError) throw orgError

    // Add creator as admin
    await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'admin' as UserRole,
      })

    return org
  } catch (error) {
    console.error('Failed to create organization:', error)
    throw error
  }
}

// ============= PROJECTS =============
export async function getProjects(organizationId?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  try {
    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    } else {
      // Get all projects from user's organizations
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)

      if (!memberships || memberships.length === 0) return []
      
      const orgIds = memberships.map(m => m.organization_id)
      query = query.in('organization_id', orgIds)
    }

    const { data: projects } = await query
    return projects || []
  } catch (error) {
    console.error('Failed to get projects:', error)
    return []
  }
}

export async function createProject(data: {
  name: string
  description?: string
  organization_id: string
  status?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  try {
    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: data.name,
        description: data.description,
        organization_id: data.organization_id,
        status: data.status || 'planning',
        created_by: user.id,
      })
      .select()
      .single()

    if (projectError) throw projectError

    // Add creator as admin
    await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: 'admin' as UserRole,
      })

    return project
  } catch (error) {
    console.error('Failed to create project:', error)
    throw error
  }
}

export async function deleteProject(projectId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Delete the project - RLS policies will handle permission checks
  // (created_by must match OR user must be org admin)
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    console.error('Failed to delete project:', error)
    throw error
  }

  return true
}

// ============= TASKS =============
export async function getTasks(projectId?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true })

    if (projectId) {
      query = query.eq('project_id', projectId)
    } else {
      // Get all tasks from user's projects
      const projects = await getProjects()
      if (projects.length === 0) return []
      
      const projectIds = projects.map(p => p.id)
      query = query.in('project_id', projectIds)
    }

    const { data: tasks } = await query
    
    // If we have tasks, fetch their assignees and project details
    if (tasks && tasks.length > 0) {
      // Get all unique project IDs
      const projectIds = [...new Set(tasks.map(t => t.project_id).filter(Boolean))]
      
      // Fetch project details
      const { data: projectDetails } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
      
      const tasksWithDetails = await Promise.all(
        tasks.map(async (task) => {
          // Get assignees
          const assignees = await getTaskAssignees(task.id)
          
          // Find project for this task
          const project = projectDetails?.find(p => p.id === task.project_id) || null
          
          return {
            ...task,
            assignees,
            project
          }
        })
      )
      return tasksWithDetails
    }
    
    return tasks || []
  } catch (error) {
    console.error('Failed to get tasks:', error)
    return []
  }
}

export async function createTask(data: {
  title: string
  description?: string
  project_id: string
  status?: string
  priority?: string
  due_date?: string
  parent_task_id?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  try {
    // Get max position for ordering
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('position')
      .eq('project_id', data.project_id)
      .eq('status', data.status || 'todo')
      .order('position', { ascending: false })
      .limit(1)

    const position = existingTasks && existingTasks[0] 
      ? existingTasks[0].position + 1 
      : 0

    // Create task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: data.title,
        description: data.description,
        project_id: data.project_id,
        parent_task_id: data.parent_task_id,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        due_date: data.due_date,
        position,
        created_by: user.id,
      })
      .select()
      .single()

    if (taskError) throw taskError

    // Auto-assign to creator
    await supabase
      .from('task_assignees')
      .insert({
        task_id: task.id,
        user_id: user.id,
        assigned_by: user.id,
      })

    return task
  } catch (error) {
    console.error('Failed to create task:', error)
    throw error
  }
}

// ============= NOTIFICATIONS =============
export async function getNotifications(limit?: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to get notifications:', error)
    return []
  }
}

export async function getUnreadNotificationCount() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return 0

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Failed to get unread notification count:', error)
    return 0
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) throw error
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    throw error
  }
}

export async function markAllNotificationsAsRead() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) throw error
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
    throw error
  }
}

export async function createNotification(data: {
  type: string
  title: string
  message?: string
  data?: any
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
      })
      .select()
      .single()

    if (error) throw error
    return notification
  } catch (error) {
    console.error('Failed to create notification:', error)
    throw error
  }
}

// Helper function to create sample notifications for testing
export async function createSampleNotifications() {
  const sampleNotifications = [
    {
      type: 'task_assigned',
      title: 'New task assigned',
      message: 'You have been assigned to "Update landing page"'
    },
    {
      type: 'task_due',
      title: 'Task due soon',
      message: 'Task "Fix login bug" is due in 2 hours'
    },
    {
      type: 'project_updated',
      title: 'Project updated',
      message: 'Website Redesign project has been updated'
    },
    {
      type: 'team_joined',
      title: 'New team member',
      message: 'Sarah Johnson joined the Development team'
    },
    {
      type: 'task_completed',
      title: 'Task completed',
      message: 'Task "Setup CI/CD" has been marked as completed'
    }
  ]

  try {
    const promises = sampleNotifications.map(notif => createNotification(notif))
    await Promise.all(promises)
    console.log('Sample notifications created successfully')
  } catch (error) {
    console.error('Failed to create sample notifications:', error)
    throw error
  }
}

export async function cloneTask(taskId: string, overrides?: {
  title?: string
  status?: string
  parent_task_id?: string
  project_id?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  try {
    // Get the original task
    const { data: originalTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (fetchError) throw fetchError
    if (!originalTask) throw new Error('Task not found')

    // Prepare cloned task data
    const clonedData = {
      title: overrides?.title || `${originalTask.title} (Copy)`,
      description: originalTask.description,
      project_id: overrides?.project_id || originalTask.project_id,
      parent_task_id: overrides?.parent_task_id || originalTask.parent_task_id,
      status: overrides?.status || 'todo', // Reset status to todo by default
      priority: originalTask.priority,
      due_date: originalTask.due_date,
    }

    // Create the cloned task using existing createTask function
    const clonedTask = await createTask(clonedData)

    return clonedTask
  } catch (error) {
    console.error('Failed to clone task:', error)
    throw error
  }
}

export async function updateTask(taskId: string, updates: any) {
  const supabase = createClient()
  
  try {
    // Clean the updates object - remove undefined values and empty strings for dates
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key, value]) => {
        // Remove undefined values
        if (value === undefined) return false
        // Convert empty date strings to null
        if ((key === 'due_date' || key === 'start_date') && value === '') {
          return false
        }
        return true
      })
    )
    
    // Ensure date fields are properly formatted or null
    if (cleanUpdates.due_date && cleanUpdates.due_date !== '') {
      // If it's just a date without time, add time
      if (!cleanUpdates.due_date.includes('T')) {
        cleanUpdates.due_date = `${cleanUpdates.due_date}T00:00:00`
      }
    }
    
    console.log('Updating task:', taskId, 'with updates:', cleanUpdates)
    
    const { data: task, error } = await supabase
      .from('tasks')
      .update(cleanUpdates)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }
    
    // Fetch assignees for the updated task
    if (task) {
      const assignees = await getTaskAssignees(task.id)
      const taskWithAssignees = {
        ...task,
        assignees
      }
      console.log('Task updated successfully:', taskWithAssignees)
      return taskWithAssignees
    }
    
    return task
  } catch (error: any) {
    console.error('Failed to update task:', {
      error,
      message: error?.message,
      taskId,
      updates
    })
    throw error
  }
}

export async function getTask(taskId: string) {
  const supabase = createClient()
  
  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (error) throw error
    
    // Fetch assignees and project for this task
    if (task) {
      const assignees = await getTaskAssignees(task.id)
      
      // Fetch project details
      let project = null
      if (task.project_id) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', task.project_id)
          .single()
        project = projectData
      }
      
      return {
        ...task,
        assignees,
        project
      }
    }
    
    return task
  } catch (error) {
    console.error('Failed to get task:', error)
    return null
  }
}

export async function deleteTask(taskId: string) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) throw error
  } catch (error) {
    console.error('Failed to delete task:', error)
    throw error
  }
}

// ============= MEMBERS =============
export async function getOrganizationMembers(organizationId: string) {
  const supabase = createClient()
  
  try {
    const { data: members } = await supabase
      .from('organization_members')
      .select('*, user:profiles!user_id(*)')
      .eq('organization_id', organizationId)

    return members || []
  } catch (error) {
    console.error('Failed to get members:', error)
    return []
  }
}

export async function getProjectMembers(projectId: string) {
  const supabase = createClient()
  
  try {
    const { data: members } = await supabase
      .from('project_members')
      .select('*, user:profiles!user_id(*)')
      .eq('project_id', projectId)

    return members || []
  } catch (error) {
    console.error('Failed to get members:', error)
    return []
  }
}

// ============= COMMENTS =============
export async function getComments(taskId: string) {
  const supabase = createClient()
  
  try {
    const { data: comments } = await supabase
      .from('comments')
      .select('*, user:profiles!user_id(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    return comments || []
  } catch (error) {
    console.error('Failed to get comments:', error)
    return []
  }
}

export async function createComment(taskId: string, content: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  try {
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        content,
      })
      .select('*, user:profiles!user_id(*)')
      .single()

    if (error) throw error
    return comment
  } catch (error) {
    console.error('Failed to create comment:', error)
    throw error
  }
}

// ============= USER PROFILE =============
export async function getCurrentUserProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return profile
  } catch (error) {
    console.error('Failed to get profile:', error)
    return null
  }
}

export async function updateUserProfile(updates: any) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return profile
  } catch (error) {
    console.error('Failed to update profile:', error)
    throw error
  }
}

export async function updateMemberProfile(userId: string, updates: any) {
  const supabase = createClient()

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return profile
  } catch (error) {
    console.error('Failed to update member profile:', error)
    throw error
  }
}

// ============= TASK ASSIGNEES =============
export async function getTaskAssignees(taskId: string) {
  const supabase = createClient()
  
  try {
    const { data: assignees } = await supabase
      .from('task_assignees')
      .select('*')
      .eq('task_id', taskId)
    
    if (!assignees || assignees.length === 0) return []
    
    // Get profiles separately
    const profileIds = assignees.map(a => a.user_id).filter(Boolean)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', profileIds)
    
    // Combine assignees with their profiles
    return assignees.map(assignee => ({
      ...assignee,
      profiles: profiles?.find(p => p.id === assignee.user_id) || null
    }))
  } catch (error) {
    console.error('Failed to get assignees:', error)
    return []
  }
}

export async function addTaskAssignee(taskId: string, userId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  try {
    const { data: assignee, error } = await supabase
      .from('task_assignees')
      .insert({
        task_id: taskId,
        user_id: userId,
        assigned_by: user.id,
      })
      .select('*')
      .single()

    if (error) throw error
    return assignee
  } catch (error) {
    console.error('Failed to add assignee:', error)
    throw error
  }
}

export async function removeTaskAssignee(taskId: string, userId: string) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', userId)

    if (error) throw error
  } catch (error) {
    console.error('Failed to remove assignee:', error)
    throw error
  }
}

// ============= TASK LABELS =============
export async function getTaskLabels(taskId: string) {
  const supabase = createClient()
  
  try {
    const { data: labels } = await supabase
      .from('task_labels')
      .select('*, labels(*)')
      .eq('task_id', taskId)

    return labels || []
  } catch (error) {
    console.error('Failed to get labels:', error)
    return []
  }
}

export async function getProjectLabels(projectId: string) {
  const supabase = createClient()

  try {
    // First get the project to find its organization
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single()

    if (!project?.organization_id) return []

    // Then get labels for that organization
    const { data: labels } = await supabase
      .from('labels')
      .select('*')
      .eq('organization_id', project.organization_id)
      .order('name')

    return labels || []
  } catch (error) {
    console.error('Failed to get project labels:', error)
    return []
  }
}

export async function createLabel(projectId: string, name: string, color: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  try {
    // First get the project to find its organization
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single()

    if (!project?.organization_id) throw new Error('Project not found')

    const { data: label, error } = await supabase
      .from('labels')
      .insert({
        organization_id: project.organization_id,
        name,
        color,
      })
      .select()
      .single()

    if (error) throw error
    return label
  } catch (error) {
    console.error('Failed to create label:', error)
    throw error
  }
}

export async function addTaskLabel(taskId: string, labelId: string) {
  const supabase = createClient()
  
  try {
    const { data: taskLabel, error } = await supabase
      .from('task_labels')
      .insert({
        task_id: taskId,
        label_id: labelId,
      })
      .select('*, labels(*)')
      .single()

    if (error) throw error
    return taskLabel
  } catch (error) {
    console.error('Failed to add label:', error)
    throw error
  }
}

export async function removeTaskLabel(taskId: string, labelId: string) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('task_labels')
      .delete()
      .eq('task_id', taskId)
      .eq('label_id', labelId)

    if (error) throw error
  } catch (error) {
    console.error('Failed to remove label:', error)
    throw error
  }
}

// ============= AVAILABLE USERS =============
export async function getAvailableAssignees(projectId: string) {
  const supabase = createClient()
  
  try {
    // Get project to find organization
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single()

    if (!project) return []

    // Get all organization members
    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id, profiles!user_id(*)')
      .eq('organization_id', project.organization_id)

    return members?.map(m => m.profiles).filter(Boolean) || []
  } catch (error) {
    console.error('Failed to get available assignees:', error)
    return []
  }
}

// ============= INVITATIONS =============
export async function getInvitations(organizationId: string) {
  const supabase = createClient()
  
  try {
    const { data: invitations } = await supabase
      .from('invitations')
      .select('*, invited_by_profile:profiles!invited_by(*)')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    return invitations || []
  } catch (error) {
    console.error('Failed to get invitations:', error)
    return []
  }
}

export async function createInvitation(data: {
  email: string
  organization_id: string
  role: 'admin' | 'manager' | 'member' | 'guest'
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  try {
    // Check if user is admin of the organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', data.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      throw new Error('Only admins can send invitations')
    }

    // Check if invitation already exists
    const { data: existing } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', data.email)
      .eq('organization_id', data.organization_id)
      .eq('status', 'pending')
      .single()

    if (existing) {
      throw new Error('An invitation has already been sent to this email')
    }

    // Get organization and inviter details
    const [{ data: organization }, { data: inviter }] = await Promise.all([
      supabase
        .from('organizations')
        .select('name')
        .eq('id', data.organization_id)
        .single(),
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
    ])

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        email: data.email,
        organization_id: data.organization_id,
        role: data.role,
        invited_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Send invitation email via Edge Function
    try {
      const response = await fetch(
        'https://aevvuzgavyuqlafflkqz.supabase.co/functions/v1/send-invitation-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            email: data.email,
            inviteCode: invitation.invite_code,
            inviterName: inviter?.full_name,
            organizationName: organization?.name || 'the team',
            role: data.role,
          }),
        }
      )

      if (!response.ok) {
        console.error('Failed to send invitation email:', await response.text())
      }
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Don't throw - invitation was created successfully
    }

    return invitation
  } catch (error) {
    console.error('Failed to create invitation:', error)
    throw error
  }
}

export async function cancelInvitation(invitationId: string) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)

    if (error) throw error
  } catch (error) {
    console.error('Failed to cancel invitation:', error)
    throw error
  }
}

export async function resendInvitation(invitationId: string) {
  const supabase = createClient()
  
  try {
    // Get invitation details first
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('*, organization:organizations(*), invited_by_profile:profiles!invited_by(*)')
      .eq('id', invitationId)
      .single()

    if (fetchError || !invitation) throw fetchError || new Error('Invitation not found')

    // Reset expiry date
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ 
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', invitationId)

    if (updateError) throw updateError
    
    // Send invitation email via Edge Function
    try {
      const response = await fetch(
        'https://aevvuzgavyuqlafflkqz.supabase.co/functions/v1/send-invitation-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            email: invitation.email,
            inviteCode: invitation.invite_code,
            inviterName: invitation.invited_by_profile?.full_name,
            organizationName: invitation.organization?.name || 'the team',
            role: invitation.role,
          }),
        }
      )

      if (!response.ok) {
        console.error('Failed to resend invitation email:', await response.text())
      }
    } catch (emailError) {
      console.error('Failed to resend invitation email:', emailError)
      // Don't throw - invitation was updated successfully
    }
    
    return invitation
  } catch (error) {
    console.error('Failed to resend invitation:', error)
    throw error
  }
}

export async function checkInvitation(code: string) {
  const supabase = createClient()
  
  try {
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*, organization:organizations(*)')
      .eq('invite_code', code)
      .eq('status', 'pending')
      .single()

    if (!invitation) return null
    
    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)
      return null
    }

    return invitation
  } catch (error) {
    console.error('Failed to check invitation:', error)
    return null
  }
}

export async function acceptInvitation(code: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  try {
    // Call the database function to accept invitation
    const { data, error } = await supabase
      .rpc('accept_invitation', {
        code,
        user_id: user.id
      })

    if (error) throw error
    if (!data) throw new Error('Invalid or expired invitation')

    return true
  } catch (error) {
    console.error('Failed to accept invitation:', error)
    throw error
  }
}

export async function updateMemberRole(memberId: string, newRole: string) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('organization_members')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) throw error
  } catch (error) {
    console.error('Failed to update member role:', error)
    throw error
  }
}

export async function removeMember(memberId: string) {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)

    if (error) throw error
  } catch (error) {
    console.error('Failed to remove member:', error)
    throw error
  }
}

export async function deleteUserCompletely(userId: string) {
  const supabase = createClient()

  try {
    // Call database function to delete user completely
    const { error } = await supabase.rpc('delete_user_completely', { user_id_to_delete: userId })

    if (error) throw error
  } catch (error) {
    console.error('Failed to delete user:', error)
    throw error
  }
}

// ============= DASHBOARD =============
export async function getDashboardStats() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  try {
    // Get user's organizations
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)

    const orgIds = memberships?.map(m => m.organization_id) || []
    
    // Get projects in user's organizations
    const { data: projects } = await supabase
      .from('projects')
      .select('id, status')
      .in('organization_id', orgIds)

    const projectIds = projects?.map(p => p.id) || []
    
    // Get tasks stats
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, status, due_date')
      .in('project_id', projectIds)

    // Calculate stats
    const now = new Date()
    const totalTasks = tasks?.length || 0
    const completedTasks = tasks?.filter(t => t.status === 'done').length || 0
    const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0
    const todoTasks = tasks?.filter(t => t.status === 'todo').length || 0
    const overdueTasks = tasks?.filter(t => 
      t.due_date && new Date(t.due_date) < now && t.status !== 'done'
    ).length || 0
    
    const totalProjects = projects?.length || 0
    const activeProjects = projects?.filter(p => p.status === 'active').length || 0
    
    // Get team members count
    const { data: teamMembers } = await supabase
      .from('organization_members')
      .select('user_id')
      .in('organization_id', orgIds)
    
    const uniqueMembers = new Set(teamMembers?.map(m => m.user_id) || [])

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      overdueTasks,
      totalProjects,
      activeProjects,
      teamMembers: uniqueMembers.size,
    }
  } catch (error) {
    console.error('Failed to get dashboard stats:', error)
    return null
  }
}

export async function getRecentTasks(limit = 5) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  try {
    // Get user's organizations
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)

    const orgIds = memberships?.map(m => m.organization_id) || []
    
    // Get recent tasks with project info
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, project:projects(*)')
      .in('project_id', (
        await supabase
          .from('projects')
          .select('id')
          .in('organization_id', orgIds)
      ).data?.map(p => p.id) || [])
      .order('updated_at', { ascending: false })
      .limit(limit * 2) // Get more to account for filtering

    // Filter out sections (tasks with folder emoji prefix) and return only regular tasks
    const { getRegularTasks } = await import('../task-utils')
    const regularTasks = getRegularTasks(tasks || [])
    return regularTasks.slice(0, limit)
  } catch (error) {
    console.error('Failed to get recent tasks:', error)
    return []
  }
}

export async function getRecentProjects(limit = 3) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  try {
    // Get user's organizations
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)

    const orgIds = memberships?.map(m => m.organization_id) || []
    
    // Get recent projects
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .in('organization_id', orgIds)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (!projects) return []

    // Get member counts and task progress for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        // Get member count
        const { data: members } = await supabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', project.id)
        
        // Get task progress
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('project_id', project.id)
        
        const totalTasks = tasks?.length || 0
        const completedTasks = tasks?.filter(t => t.status === 'done').length || 0
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        return {
          ...project,
          members: members?.length || 0,
          progress,
          totalTasks,
          completedTasks,
        }
      })
    )

    return projectsWithStats
  } catch (error) {
    console.error('Failed to get recent projects:', error)
    return []
  }
}