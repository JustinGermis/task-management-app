import { createClient } from '@/lib/supabase/client'
import { TaskWithDetails, CreateTaskData, TaskStatus, TaskPriority } from '@/lib/types'

export async function getTasks(projectId?: string): Promise<TaskWithDetails[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  let query = supabase
    .from('tasks')
    .select(`
      *,
      project:project_id(*),
      assignees:task_assignees(
        id,
        assigned_at,
        profiles:user_id(*)
      ),
      comments:comments(
        id,
        content,
        created_at,
        profiles:user_id(*)
      ),
      labels:task_labels(
        id,
        labels:label_id(*)
      ),
      created_by_profile:created_by(*)
    `)
    .order('position', { ascending: true })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function getTask(id: string): Promise<TaskWithDetails | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:project_id(*),
      assignees:task_assignees(
        id,
        assigned_at,
        assigned_by,
        profiles:user_id(*)
      ),
      comments:comments(
        id,
        content,
        created_at,
        profiles:user_id(*)
      ),
      labels:task_labels(
        id,
        labels:label_id(*)
      ),
      created_by_profile:created_by(*),
      dependencies:task_dependencies(
        id,
        depends_on:depends_on_task_id(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createTask(data: CreateTaskData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  // Get the highest position for the project
  const { data: lastTask } = await supabase
    .from('tasks')
    .select('position')
    .eq('project_id', data.project_id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = (lastTask?.position || 0) + 1

  // Create task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      title: data.title,
      description: data.description,
      priority: data.priority,
      due_date: data.due_date,
      project_id: data.project_id,
      created_by: user.id,
      status: 'todo',
      position,
    })
    .select()
    .single()

  if (taskError) throw taskError

  // Add assignees
  if (data.assignee_ids && data.assignee_ids.length > 0) {
    const assignees = data.assignee_ids.map(userId => ({
      task_id: task.id,
      user_id: userId,
      assigned_by: user.id,
    }))

    const { error: assigneeError } = await supabase
      .from('task_assignees')
      .insert(assignees)

    if (assigneeError) throw assigneeError
  }

  return task
}

export async function updateTask(id: string, data: Partial<CreateTaskData>) {
  const supabase = createClient()
  
  const { data: task, error } = await supabase
    .from('tasks')
    .update({
      title: data.title,
      description: data.description,
      priority: data.priority,
      due_date: data.due_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return task
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  const updateData: any = { 
    status,
    updated_at: new Date().toISOString(),
  }

  // If marking as done, set completion details
  if (status === 'done') {
    updateData.completed_at = new Date().toISOString()
    updateData.completed_by = user.id
    updateData.progress = 100
  } else {
    updateData.completed_at = null
    updateData.completed_by = null
    if (status === 'todo') {
      updateData.progress = 0
    }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return task
}

export async function updateTaskPosition(id: string, newPosition: number) {
  const supabase = createClient()
  
  const { data: task, error } = await supabase
    .from('tasks')
    .update({ 
      position: newPosition,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return task
}

export async function deleteTask(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function assignTask(taskId: string, userId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('task_assignees')
    .insert({
      task_id: taskId,
      user_id: userId,
      assigned_by: user.id,
    })

  if (error) throw error
}

export async function unassignTask(taskId: string, userId: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function updateTaskProgress(id: string, progress: number) {
  const supabase = createClient()
  
  const { data: task, error } = await supabase
    .from('tasks')
    .update({ 
      progress,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return task
}

export async function addComment(taskId: string, content: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      task_id: taskId,
      user_id: user.id,
      content,
    })
    .select(`
      *,
      profiles:user_id(*)
    `)
    .single()

  if (error) throw error
  return comment
}