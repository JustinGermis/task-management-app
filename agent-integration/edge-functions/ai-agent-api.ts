import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
}

// Verify agent authentication
function verifyAgentKey(req: Request): boolean {
  const agentKey = req.headers.get('x-agent-key')
  const expectedKey = Deno.env.get('AI_AGENT_SECRET_KEY')
  return agentKey === expectedKey
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify agent authentication
  if (!verifyAgentKey(req)) {
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

    const { action, params } = await req.json()

    switch (action) {
      // ========== TASK OPERATIONS ==========
      case 'list_tasks': {
        const { project_id, status, assignee_id, limit = 100 } = params || {}
        
        let query = supabase
          .from('tasks')
          .select(`
            *,
            project:projects(*),
            assignees:task_assignees(
              user_id,
              profiles:profiles(*)
            ),
            comments:comments(count)
          `)
          .limit(limit)
          .order('created_at', { ascending: false })

        if (project_id) query = query.eq('project_id', project_id)
        if (status) query = query.eq('status', status)
        if (assignee_id) {
          query = query.in('id', 
            supabase
              .from('task_assignees')
              .select('task_id')
              .eq('user_id', assignee_id)
          )
        }

        const { data: tasks, error } = await query
        
        if (error) throw error
        
        return new Response(
          JSON.stringify({ tasks }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create_task': {
        const { title, description, project_id, priority, due_date, status, parent_task_id } = params
        
        if (!title || !project_id) {
          throw new Error('Title and project_id are required')
        }

        const { data: task, error } = await supabase
          .from('tasks')
          .insert({
            title,
            description,
            project_id,
            priority: priority || 'medium',
            due_date,
            status: status || 'todo',
            parent_task_id,
            created_by: 'ai-agent', // Track that this was created by AI
          })
          .select()
          .single()

        if (error) throw error

        // Log agent activity
        await supabase
          .from('activity_logs')
          .insert({
            entity_type: 'task',
            entity_id: task.id,
            action: 'created_by_agent',
            user_id: 'ai-agent',
            changes: { created_task: task }
          })

        return new Response(
          JSON.stringify({ task }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update_task': {
        const { task_id, updates } = params
        
        if (!task_id) {
          throw new Error('task_id is required')
        }

        const { data: task, error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', task_id)
          .select()
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify({ task }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'assign_task': {
        const { task_id, user_id } = params
        
        if (!task_id || !user_id) {
          throw new Error('task_id and user_id are required')
        }

        const { error } = await supabase
          .from('task_assignees')
          .insert({ task_id, user_id })

        if (error && !error.message.includes('duplicate')) throw error

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ========== PROJECT OPERATIONS ==========
      case 'create_project': {
        const { name, description, organization_id, status } = params
        
        if (!name || !organization_id) {
          throw new Error('Name and organization_id are required')
        }

        const { data: project, error } = await supabase
          .from('projects')
          .insert({
            name,
            description,
            organization_id,
            status: status || 'planning',
            created_by: 'ai-agent'
          })
          .select()
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify({ project }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'list_projects': {
        const { organization_id, limit = 50 } = params || {}
        
        let query = supabase
          .from('projects')
          .select('*, organization:organizations(*)')
          .limit(limit)
          .order('created_at', { ascending: false })

        if (organization_id) {
          query = query.eq('organization_id', organization_id)
        }

        const { data: projects, error } = await query
        
        if (error) throw error
        
        return new Response(
          JSON.stringify({ projects }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ========== ANALYSIS OPERATIONS ==========
      case 'analyze_workload': {
        const { user_id } = params || {}
        
        // Get task statistics
        let taskQuery = supabase
          .from('tasks')
          .select('status, priority, due_date', { count: 'exact' })
        
        if (user_id) {
          const { data: assignedTaskIds } = await supabase
            .from('task_assignees')
            .select('task_id')
            .eq('user_id', user_id)
          
          const ids = assignedTaskIds?.map(t => t.task_id) || []
          taskQuery = taskQuery.in('id', ids)
        }

        const { data: tasks, count } = await taskQuery

        // Calculate workload metrics
        const metrics = {
          total_tasks: count || 0,
          by_status: {},
          by_priority: {},
          overdue: 0,
          due_this_week: 0,
        }

        const now = new Date()
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        tasks?.forEach(task => {
          // Count by status
          metrics.by_status[task.status] = (metrics.by_status[task.status] || 0) + 1
          
          // Count by priority
          metrics.by_priority[task.priority] = (metrics.by_priority[task.priority] || 0) + 1
          
          // Check due dates
          if (task.due_date) {
            const dueDate = new Date(task.due_date)
            if (dueDate < now) {
              metrics.overdue++
            } else if (dueDate <= weekFromNow) {
              metrics.due_this_week++
            }
          }
        })

        return new Response(
          JSON.stringify({ workload: metrics }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'find_suitable_agent_tasks': {
        // Find tasks suitable for automation
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select(`
            *,
            project:projects(name),
            assignees:task_assignees(count)
          `)
          .eq('status', 'todo')
          .is('assignees.count', 0) // Unassigned tasks
          .in('priority', ['low', 'medium'])
          .limit(20)

        if (error) throw error

        // Categorize tasks by type (based on title/description patterns)
        const categorized = {
          documentation: [],
          testing: [],
          code_review: [],
          research: [],
          data_entry: [],
          other: []
        }

        tasks?.forEach(task => {
          const text = `${task.title} ${task.description || ''}`.toLowerCase()
          
          if (text.includes('document') || text.includes('readme') || text.includes('guide')) {
            categorized.documentation.push(task)
          } else if (text.includes('test') || text.includes('qa') || text.includes('bug')) {
            categorized.testing.push(task)
          } else if (text.includes('review') || text.includes('pr ') || text.includes('pull request')) {
            categorized.code_review.push(task)
          } else if (text.includes('research') || text.includes('investigate') || text.includes('explore')) {
            categorized.research.push(task)
          } else if (text.includes('data') || text.includes('entry') || text.includes('update records')) {
            categorized.data_entry.push(task)
          } else {
            categorized.other.push(task)
          }
        })

        return new Response(
          JSON.stringify({ suitable_tasks: categorized }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ========== COMMENT OPERATIONS ==========
      case 'add_comment': {
        const { task_id, content } = params
        
        if (!task_id || !content) {
          throw new Error('task_id and content are required')
        }

        const { data: comment, error } = await supabase
          .from('comments')
          .insert({
            task_id,
            content: `[AI Agent]: ${content}`,
            user_id: 'ai-agent'
          })
          .select()
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify({ comment }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Error in ai-agent-api:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})