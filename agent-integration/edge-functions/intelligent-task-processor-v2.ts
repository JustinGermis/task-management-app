import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
}

// OpenAI configuration
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface TeamMember {
  id?: string
  name: string
  email: string
  job_title: string
  expertise: string[]
  is_ai_agent: boolean
  ai_capabilities?: string[]
}

interface ExtractedTask {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignees: string[] // Names or emails of assignees
  due_date?: string
  project_hint?: string // Keywords to help determine project
  section_hint?: string // Keywords to help determine section
}

async function getTeamMembers(supabase: any): Promise<TeamMember[]> {
  const { data: members } = await supabase
    .from('team_members')
    .select('*')
  
  const { data: realUsers } = await supabase
    .from('profiles')
    .select('id, email, full_name, job_title, expertise, is_ai_agent, ai_capabilities')
    .not('job_title', 'is', null)
  
  const allMembers: TeamMember[] = []
  
  // Add real users
  if (realUsers) {
    realUsers.forEach((user: any) => {
      allMembers.push({
        id: user.id,
        name: user.full_name,
        email: user.email,
        job_title: user.job_title,
        expertise: user.expertise || [],
        is_ai_agent: user.is_ai_agent || false,
        ai_capabilities: user.ai_capabilities
      })
    })
  }
  
  // Add team members
  if (members) {
    members.forEach((member: any) => {
      allMembers.push({
        name: member.name,
        email: member.email,
        job_title: member.job_title,
        expertise: member.expertise || [],
        is_ai_agent: member.is_ai_agent || false,
        ai_capabilities: member.ai_capabilities
      })
    })
  }
  
  return allMembers
}

async function intelligentTaskExtraction(content: string, metadata: any, teamMembers: TeamMember[]) {
  const currentDate = new Date().toISOString().split('T')[0]
  const teamMembersList = teamMembers.map(m => `- ${m.name} (${m.email}): ${m.job_title} - Expertise: ${m.expertise.join(', ')}`).join('\n')
  
  const prompt = `Current date: ${currentDate}

Analyze this email and extract ALL actionable tasks mentioned, assigning them to the appropriate team members.

Team Members:
${teamMembersList}

Email Details:
From: ${metadata.from || 'Unknown'}
To: ${metadata.to || 'Unknown'}
CC: ${metadata.cc || ''}
Subject: ${metadata.subject || 'No subject'}
Date: ${metadata.date || currentDate}
Content: ${content}

IMPORTANT RULES:
1. Extract ALL tasks mentioned in the email, not just those for the recipient
2. Assign tasks to appropriate team members based on their expertise and the task requirements
3. Tasks can be assigned to multiple people if collaboration is needed
4. Assign to the AI Agent (Claude) tasks that match its capabilities: ${teamMembers.find(m => m.is_ai_agent)?.ai_capabilities?.join(', ')}
5. Use relative dates (e.g., "by Friday", "next week") and convert them to actual dates based on current date: ${currentDate}
6. Determine project based on content (POV Development, Client Projects, Internal Tools)
7. Determine section based on urgency (Backlog, This Week, In Progress, Review)

Return JSON:
{
  "tasks": [
    {
      "title": "Clear, actionable task title",
      "description": "Brief context from the email",
      "priority": "critical|high|medium|low",
      "assignees": ["name or email of assignee(s)"],
      "due_date": "YYYY-MM-DD or null",
      "project_hint": "keywords to determine project",
      "section_hint": "backlog|this_week|in_progress|review"
    }
  ]
}`

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
          content: 'You are an expert project manager who assigns tasks to the right team members based on their skills and expertise. Always use the current date provided to calculate actual due dates from relative dates mentioned in emails.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('OpenAI API error:', errorText)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  const result = JSON.parse(data.choices[0].message.content)
  
  return result.tasks || []
}

async function determineProjectAndSection(supabase: any, task: ExtractedTask) {
  // Get projects with their sections
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      task_sections (
        id,
        name
      )
    `)
    .eq('organization_id', '49189da0-e405-4845-9112-7761a75305d1')
  
  if (!projects || projects.length === 0) {
    return null
  }
  
  // Determine project based on hints
  let selectedProject = projects[0] // Default
  
  if (task.project_hint) {
    const hint = task.project_hint.toLowerCase()
    if (hint.includes('pov') || hint.includes('point of view')) {
      selectedProject = projects.find(p => p.name === 'POV Development') || selectedProject
    } else if (hint.includes('client') || hint.includes('external')) {
      selectedProject = projects.find(p => p.name === 'Client Projects') || selectedProject
    } else if (hint.includes('internal') || hint.includes('tool') || hint.includes('automation')) {
      selectedProject = projects.find(p => p.name === 'Internal Tools') || selectedProject
    }
  }
  
  // Determine section based on hints and priority
  let selectedSection = selectedProject.task_sections?.[0] // Default to first section
  
  if (task.section_hint && selectedProject.task_sections) {
    const hint = task.section_hint.toLowerCase()
    if (hint.includes('backlog')) {
      selectedSection = selectedProject.task_sections.find((s: any) => s.name === 'Backlog') || selectedSection
    } else if (hint.includes('this_week') || task.priority === 'high' || task.priority === 'critical') {
      selectedSection = selectedProject.task_sections.find((s: any) => s.name === 'This Week') || selectedSection
    } else if (hint.includes('in_progress')) {
      selectedSection = selectedProject.task_sections.find((s: any) => s.name === 'In Progress') || selectedSection
    } else if (hint.includes('review')) {
      selectedSection = selectedProject.task_sections.find((s: any) => s.name === 'Review') || selectedSection
    }
  }
  
  return {
    project_id: selectedProject.id,
    section_id: selectedSection?.id
  }
}

async function findUserIds(supabase: any, assignees: string[]): Promise<string[]> {
  const userIds: string[] = []
  
  for (const assignee of assignees) {
    // Check profiles first (real users)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .or(`email.eq.${assignee},full_name.ilike.%${assignee}%`)
      .single()
    
    if (profile) {
      userIds.push(profile.id)
    } else {
      // For team members without accounts, we'll need a different approach
      // For now, we'll assign to the main user
      console.log(`Team member ${assignee} doesn't have an account yet`)
    }
  }
  
  // If no valid assignees found, assign to main user
  if (userIds.length === 0) {
    userIds.push('63b052b5-7d7d-4dee-a9ab-ca8909f4670e') // Justin as default
  }
  
  return userIds
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
        
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )
        
        // Get team members
        const teamMembers = await getTeamMembers(supabase)
        
        // Extract tasks with intelligent assignment
        const extractedTasks = await intelligentTaskExtraction(content, metadata, teamMembers)
        
        if (extractedTasks.length === 0) {
          return new Response(
            JSON.stringify({ 
              message: 'No actionable tasks found',
              created_tasks: []
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        const createdTasks = []
        
        // Create tasks with proper assignments
        for (const task of extractedTasks) {
          // Determine project and section
          const projectInfo = await determineProjectAndSection(supabase, task)
          
          if (!projectInfo) {
            console.error('No project found for task:', task.title)
            continue
          }
          
          // Find user IDs for assignees
          const assigneeIds = await findUserIds(supabase, task.assignees)
          
          // Create the task
          const { data: newTask, error } = await supabase
            .from('tasks')
            .insert({
              title: task.title,
              description: task.description || `From: ${metadata.from}\nSubject: ${metadata.subject}`,
              project_id: projectInfo.project_id,
              section_id: projectInfo.section_id,
              priority: task.priority || 'medium',
              due_date: task.due_date,
              status: 'todo',
              created_by: '63b052b5-7d7d-4dee-a9ab-ca8909f4670e' // Justin as creator
            })
            .select()
            .single()
          
          if (!error && newTask) {
            // Assign task to users
            for (const userId of assigneeIds) {
              await supabase
                .from('task_assignees')
                .insert({
                  task_id: newTask.id,
                  user_id: userId
                })
            }
            
            createdTasks.push({
              ...newTask,
              assignees: task.assignees
            })
            
            console.log(`Created task: ${newTask.title} assigned to ${task.assignees.join(', ')}`)
            
            // Log the creation
            await supabase
              .from('activity_logs')
              .insert({
                entity_type: 'task',
                entity_id: newTask.id,
                action: 'created_from_email',
                user_id: '63b052b5-7d7d-4dee-a9ab-ca8909f4670e',
                changes: {
                  email_thread_id: metadata.threadId,
                  email_message_id: metadata.messageId,
                  assigned_to: task.assignees
                }
              })
          } else if (error) {
            console.error('Failed to create task:', error)
          }
        }
        
        return new Response(
          JSON.stringify({ 
            message: `Created ${createdTasks.length} tasks`,
            created_tasks: createdTasks,
            team_members: teamMembers.map(m => m.name)
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