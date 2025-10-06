import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
}

// OpenAI configuration
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface TaskAnalysis {
  suitable_for_automation: boolean
  recommended_agent: string
  complexity: 'low' | 'medium' | 'high'
  estimated_time: string
  reasoning: string
}

async function analyzeTaskWithAI(task: any): Promise<TaskAnalysis> {
  const prompt = `Analyze this task and determine if it's suitable for automation:
    
Task Title: ${task.title}
Description: ${task.description || 'No description'}
Priority: ${task.priority}
Status: ${task.status}

Please provide:
1. Is this suitable for automation? (true/false)
2. Which agent type should handle it? (developer/writer/qa/research/none)
3. Task complexity (low/medium/high)
4. Estimated time to complete
5. Brief reasoning

Respond in JSON format.`

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a task analysis expert. Analyze tasks and determine if they can be automated by AI agents.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return JSON.parse(data.choices[0].message.content)
}

async function processEmailWithAI(content: string, metadata: any) {
  const prompt = `Extract actionable tasks from this email/transcript:

Content: ${content}
Metadata: ${JSON.stringify(metadata)}

Extract:
1. All action items as tasks
2. Project groupings if multiple related tasks
3. Due dates from context
4. Priority levels based on urgency words
5. Potential assignees from mentioned names

Format the response as:
{
  "projects": [
    {
      "name": "Project Name",
      "description": "Description",
      "tasks": [
        {
          "title": "Task title",
          "description": "Details",
          "priority": "low|medium|high|critical",
          "due_date": "YYYY-MM-DD or null",
          "assignee_email": "email or null"
        }
      ]
    }
  ],
  "standalone_tasks": [...],
  "summary": "Brief summary of extracted items"
}`

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting actionable tasks from emails and meeting notes. Be thorough but avoid creating unnecessary tasks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return JSON.parse(data.choices[0].message.content)
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
    const { action, data } = await req.json()

    switch (action) {
      case 'analyze_task': {
        const analysis = await analyzeTaskWithAI(data.task)
        return new Response(
          JSON.stringify({ analysis }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'process_email': {
        // Handle both old format and new Gmail format
        const content = data.content || data.body || ''
        const metadata = data.metadata || {
          from: data.from,
          to: data.to,
          cc: data.cc,
          subject: data.subject,
          date: data.date,
          source: 'gmail'
        }
        
        const processed = await processEmailWithAI(content, metadata)
        
        // Auto-create tasks if extraction was successful
        const createdTasks = []
        if (processed.standalone_tasks && processed.standalone_tasks.length > 0) {
          const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          )
          
          // Get first project and user for task creation
          const { data: projects } = await supabase
            .from('projects')
            .select('id')
            .limit(1)
          
          const { data: users } = await supabase
            .from('profiles')
            .select('id')
            .limit(1)
          
          if (projects && projects.length > 0 && users && users.length > 0) {
            const projectId = projects[0].id
            const userId = users[0].id
            
            // Create tasks
            for (const task of processed.standalone_tasks) {
              const { data: newTask, error } = await supabase
                .from('tasks')
                .insert({
                  title: task.title,
                  description: task.description || `Extracted from email: ${metadata.subject || 'No subject'}`,
                  project_id: projectId,
                  priority: task.priority || 'medium',
                  due_date: task.due_date,
                  status: 'todo',
                  created_by: userId
                })
                .select()
                .single()
              
              if (!error && newTask) {
                createdTasks.push(newTask)
                console.log('Created task:', newTask.title)
              } else {
                console.error('Failed to create task:', error)
              }
            }
          }
        }
        
        return new Response(
          JSON.stringify({ 
            processed,
            created_tasks: createdTasks,
            message: createdTasks.length > 0 
              ? `Successfully created ${createdTasks.length} tasks` 
              : 'No tasks were created'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'generate_task_plan': {
        const { task } = data
        const prompt = `Create an execution plan for this task:
          Title: ${task.title}
          Description: ${task.description}
          
          Provide step-by-step instructions for completing this task.`
        
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              { role: 'system', content: 'You are a project planning expert.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.5,
          }),
        })

        const result = await response.json()
        return new Response(
          JSON.stringify({ plan: result.choices[0].message.content }),
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
    console.error('Error in ai-task-processor:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})