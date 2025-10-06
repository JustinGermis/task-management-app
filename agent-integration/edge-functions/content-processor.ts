import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
}

// Structured data format for agent processing
interface ProcessedContent {
  projects: Array<{
    name: string
    description: string
    tasks: Array<{
      title: string
      description?: string
      priority: 'low' | 'medium' | 'high' | 'critical'
      due_date?: string
      assignee_email?: string
    }>
  }>
  standalone_tasks: Array<{
    title: string
    description?: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    due_date?: string
    project_name?: string
  }>
  summary: string
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify agent authentication
  const agentKey = req.headers.get('x-agent-key')
  const expectedKey = Deno.env.get('AI_AGENT_SECRET_KEY')
  
  if (agentKey !== expectedKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid agent key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { 
      content_type, // 'email' | 'transcript' | 'document'
      content, // Raw text content
      metadata, // Additional context (sender, date, participants, etc.)
      organization_id,
      processed_data // If agent has already processed, this contains structured data
    } = await req.json()

    if (!content && !processed_data) {
      throw new Error('Either content or processed_data is required')
    }

    if (!organization_id) {
      throw new Error('organization_id is required')
    }

    // If we have processed data from the agent, create the projects and tasks
    if (processed_data) {
      const results = {
        created_projects: [],
        created_tasks: [],
        errors: []
      }

      const processedContent = processed_data as ProcessedContent

      // Create projects with their tasks
      for (const projectData of processedContent.projects || []) {
        try {
          // Create project
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert({
              name: projectData.name,
              description: projectData.description,
              organization_id,
              status: 'planning',
              created_by: 'ai-agent'
            })
            .select()
            .single()

          if (projectError) throw projectError
          results.created_projects.push(project)

          // Create tasks for this project
          for (const taskData of projectData.tasks || []) {
            try {
              // Look up assignee if email provided
              let assignee_id = null
              if (taskData.assignee_email) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('email', taskData.assignee_email)
                  .single()
                
                assignee_id = profile?.id
              }

              const { data: task, error: taskError } = await supabase
                .from('tasks')
                .insert({
                  title: taskData.title,
                  description: taskData.description,
                  project_id: project.id,
                  priority: taskData.priority,
                  due_date: taskData.due_date,
                  status: 'todo',
                  created_by: 'ai-agent'
                })
                .select()
                .single()

              if (taskError) throw taskError
              results.created_tasks.push(task)

              // Assign task if we found the user
              if (assignee_id && task) {
                await supabase
                  .from('task_assignees')
                  .insert({
                    task_id: task.id,
                    user_id: assignee_id
                  })
              }
            } catch (error) {
              results.errors.push({
                task: taskData.title,
                error: error.message
              })
            }
          }
        } catch (error) {
          results.errors.push({
            project: projectData.name,
            error: error.message
          })
        }
      }

      // Create standalone tasks
      for (const taskData of processedContent.standalone_tasks || []) {
        try {
          // Find or create project if specified
          let project_id = null
          if (taskData.project_name) {
            const { data: existingProject } = await supabase
              .from('projects')
              .select('id')
              .eq('name', taskData.project_name)
              .eq('organization_id', organization_id)
              .single()

            if (existingProject) {
              project_id = existingProject.id
            } else {
              // Create a new project for this task
              const { data: newProject } = await supabase
                .from('projects')
                .insert({
                  name: taskData.project_name,
                  description: `Auto-created from ${content_type}`,
                  organization_id,
                  status: 'planning',
                  created_by: 'ai-agent'
                })
                .select()
                .single()
              
              if (newProject) {
                project_id = newProject.id
                results.created_projects.push(newProject)
              }
            }
          }

          // If no project specified or found, use a default inbox project
          if (!project_id) {
            const { data: inboxProject } = await supabase
              .from('projects')
              .select('id')
              .eq('name', 'Inbox')
              .eq('organization_id', organization_id)
              .single()

            if (inboxProject) {
              project_id = inboxProject.id
            } else {
              // Create inbox project
              const { data: newInbox } = await supabase
                .from('projects')
                .insert({
                  name: 'Inbox',
                  description: 'Tasks extracted from emails and documents',
                  organization_id,
                  status: 'active',
                  created_by: 'ai-agent'
                })
                .select()
                .single()
              
              if (newInbox) {
                project_id = newInbox.id
                results.created_projects.push(newInbox)
              }
            }
          }

          if (project_id) {
            const { data: task, error: taskError } = await supabase
              .from('tasks')
              .insert({
                title: taskData.title,
                description: taskData.description,
                project_id,
                priority: taskData.priority,
                due_date: taskData.due_date,
                status: 'todo',
                created_by: 'ai-agent'
              })
              .select()
              .single()

            if (taskError) throw taskError
            results.created_tasks.push(task)
          }
        } catch (error) {
          results.errors.push({
            task: taskData.title,
            error: error.message
          })
        }
      }

      // Log the processing activity
      await supabase
        .from('activity_logs')
        .insert({
          entity_type: 'content_processing',
          entity_id: organization_id,
          action: 'processed_content',
          user_id: 'ai-agent',
          changes: {
            content_type,
            summary: processedContent.summary,
            created_projects: results.created_projects.length,
            created_tasks: results.created_tasks.length,
            errors: results.errors.length
          }
        })

      return new Response(
        JSON.stringify({
          success: true,
          results,
          summary: processedContent.summary
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Return the raw content for the agent to process
      // The agent will call this endpoint again with processed_data
      return new Response(
        JSON.stringify({
          content_type,
          content,
          metadata,
          organization_id,
          instructions: {
            task: 'Process this content and extract projects and tasks',
            format: 'Return as ProcessedContent structure',
            guidelines: [
              'Identify clear action items and deadlines',
              'Group related tasks into projects when appropriate',
              'Assign priority based on urgency indicators',
              'Extract assignee information from context if available',
              'Create a brief summary of the content'
            ]
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error in content-processor:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})