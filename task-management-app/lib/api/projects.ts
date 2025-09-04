import { createClient } from '@/lib/supabase/client'
import { ProjectWithDetails, CreateProjectData, UserRole } from '@/lib/types'

export async function getProjects(organizationId?: string): Promise<ProjectWithDetails[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  let query = supabase
    .from('projects')
    .select(`
      *,
      organization:organization_id(*),
      members:project_members(
        id,
        role,
        joined_at,
        profiles:user_id(*)
      ),
      tasks(
        id,
        title,
        status,
        priority,
        due_date
      )
    `)
    .order('created_at', { ascending: false })

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  // Filter projects where user is a member
  query = query.or(`
    project_members.user_id.eq.${user.id},
    created_by.eq.${user.id}
  `)

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function getProject(id: string): Promise<ProjectWithDetails | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      organization:organization_id(*),
      members:project_members(
        id,
        role,
        joined_at,
        profiles:user_id(*)
      ),
      tasks(
        id,
        title,
        status,
        priority,
        due_date,
        assignees:task_assignees(
          profiles:user_id(*)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createProject(data: CreateProjectData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  // Create project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: data.name,
      description: data.description,
      color: data.color,
      start_date: data.start_date,
      end_date: data.end_date,
      organization_id: data.organization_id,
      created_by: user.id,
      status: 'planning',
    })
    .select()
    .single()

  if (projectError) throw projectError

  // Add creator as admin member
  const { error: memberError } = await supabase
    .from('project_members')
    .insert({
      project_id: project.id,
      user_id: user.id,
      role: 'admin' as UserRole,
    })

  if (memberError) throw memberError

  return project
}

export async function updateProject(id: string, data: Partial<CreateProjectData>) {
  const supabase = createClient()
  
  const { data: project, error } = await supabase
    .from('projects')
    .update({
      name: data.name,
      description: data.description,
      color: data.color,
      start_date: data.start_date,
      end_date: data.end_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return project
}

export async function deleteProject(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function addProjectMember(projectId: string, userId: string, role: UserRole = 'member') {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('project_members')
    .insert({
      project_id: projectId,
      user_id: userId,
      role,
    })

  if (error) throw error
}

export async function removeProjectMember(projectId: string, userId: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function updateProjectMemberRole(projectId: string, userId: string, role: UserRole) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function updateProjectStatus(id: string, status: string) {
  const supabase = createClient()
  
  const { data: project, error } = await supabase
    .from('projects')
    .update({ 
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return project
}