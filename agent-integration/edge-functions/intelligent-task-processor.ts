import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
}

// OpenAI configuration
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface ExtractedTask {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee?: string
  due_date?: string
  is_actionable_by_user: boolean
  similarity_key: string
}

async function checkExistingTasks(supabase: any, tasks: ExtractedTask[]) {
  // Get existing tasks from the last 30 days
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('id, title, status')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  
  const newTasks = []
  const duplicates = []
  
  for (const task of tasks) {
    // Check for similar existing tasks
    const isDuplicate = existingTasks?.some(existing => {
      const similarity = calculateSimilarity(task.title, existing.title)
      return similarity > 0.8 || // 80% similar
             (existing.status !== 'completed' && similarity > 0.6) // 60% similar if not completed
    })
    
    if (isDuplicate) {
      duplicates.push(task)
    } else {
      newTasks.push(task)
    }
  }
  
  return { newTasks, duplicates }
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  // Simple word-based similarity
  const words1 = new Set(s1.split(/\s+/))
  const words2 = new Set(s2.split(/\s+/))
  
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  return intersection.size / union.size
}

async function intelligentEmailProcessing(content: string, metadata: any) {
  const prompt = `Analyze this email and extract ONLY actionable tasks for the email recipient.

Email Details:
From: ${metadata.from || 'Unknown'}
To: ${metadata.to || 'Unknown'}
Subject: ${metadata.subject || 'No subject'}
Content: ${content}

IMPORTANT RULES:
1. Only extract tasks that the RECIPIENT needs to do (not what others will do)
2. Skip informational items (e.g., "Lynne will join the meeting")
3. Consolidate related tasks into single items
4. Mark tasks as actionable_by_user: true ONLY if they require the recipient's action
5. For each task, determine:
   - Priority: critical (urgent/blocking), high (important), medium (normal), low (nice to have)
   - Due date: Extract if mentioned, otherwise null
   - Is this actionable by the email recipient?

Format as JSON array:
[{
  "title": "Clear, actionable task title",
  "description": "Brief context",
  "priority": "critical|high|medium|low",
  "due_date": "YYYY-MM-DD or null",
  "is_actionable_by_user": true/false,
  "assignee": "person name if mentioned"
}]

If there are NO actionable tasks for the recipient, return empty array []`

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting ONLY actionable tasks from emails. Be very selective - most emails do not require new tasks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('OpenAI API error:', errorText)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  const result = JSON.parse(data.choices[0].message.content)
  
  // Filter to only actionable tasks
  const tasks = (result.tasks || result || []).filter((t: any) => 
    t.is_actionable_by_user !== false && 
    t.title && 
    t.title.length > 5
  )
  
  // Add similarity keys for duplicate detection
  return tasks.map((task: any) => ({
    ...task,
    similarity_key: task.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50)
  }))
}

async function determineProjectAndSection(supabase: any, emailMetadata: any) {
  // Get projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('status', 'active')
  
  if (!projects || projects.length === 0) {
    return null
  }
  
  // Simple heuristic: Use first active project for now
  // In future: Match based on email domain, subject patterns, etc.
  const project = projects[0]
  
  // Determine section based on priority and due date
  // Sections typically are: Backlog, This Week, In Progress, Done
  // This would need to be customized based on your actual section structure
  
  return {
    project_id: project.id,
    section: 'backlog' // Default to backlog, let user organize
  }
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
      case 'process_email': {
        const content = data.content || data.body || ''
        const metadata = data.metadata || {
          from: data.from,
          to: data.to,
          cc: data.cc,
          subject: data.subject,
          date: data.date,
          threadId: data.threadId,
          messageId: data.messageId
        }
        
        // Skip if this is a sent email (from the user)
        if (metadata.from && metadata.from.includes('@strideshift.ai')) {
          return new Response(
            JSON.stringify({ 
              message: 'Skipping sent email',
              created_tasks: []
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Extract tasks intelligently
        const extractedTasks = await intelligentEmailProcessing(content, metadata)
        
        if (extractedTasks.length === 0) {
          return new Response(
            JSON.stringify({ 
              message: 'No actionable tasks found',
              created_tasks: []
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )
        
        // Check for existing similar tasks
        const { newTasks, duplicates } = await checkExistingTasks(supabase, extractedTasks)
        
        if (newTasks.length === 0) {
          return new Response(
            JSON.stringify({ 
              message: `All ${duplicates.length} tasks already exist`,
              created_tasks: [],
              duplicates: duplicates.map(d => d.title)
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Determine project and section
        const projectInfo = await determineProjectAndSection(supabase, metadata)
        
        if (!projectInfo) {
          return new Response(
            JSON.stringify({ 
              error: 'No active project found',
              created_tasks: []
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Get user for task creation
        const { data: users } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
        
        if (!users || users.length === 0) {
          throw new Error('No user found')
        }
        
        const userId = users[0].id
        const createdTasks = []
        
        // Create only new, actionable tasks
        for (const task of newTasks) {
          // Additional check: Skip if title contains "will" followed by a person's name
          if (/\b(will|is going to)\s+\w+/i.test(task.title) && 
              !task.title.toLowerCase().includes('you') &&
              !task.title.toLowerCase().includes('i ')) {
            console.log('Skipping task assigned to others:', task.title)
            continue
          }
          
          const { data: newTask, error } = await supabase
            .from('tasks')
            .insert({
              title: task.title,
              description: task.description || `From: ${metadata.from}\nSubject: ${metadata.subject}`,
              project_id: projectInfo.project_id,
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
            
            // Track email source to prevent reprocessing
            await supabase
              .from('activity_logs')
              .insert({
                entity_type: 'task',
                entity_id: newTask.id,
                action: 'created_from_email',
                user_id: userId,
                changes: {
                  email_thread_id: metadata.threadId,
                  email_message_id: metadata.messageId
                }
              })
          }
        }
        
        return new Response(
          JSON.stringify({ 
            message: `Created ${createdTasks.length} new tasks, skipped ${duplicates.length} duplicates`,
            created_tasks: createdTasks,
            duplicates: duplicates.map(d => d.title)
          }),
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
    console.error('Error in intelligent-task-processor:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})