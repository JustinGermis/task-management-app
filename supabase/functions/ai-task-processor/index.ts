import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExtractedTask {
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedHours: number
  requiredSkills: string[]
  suggestedAssignee?: string
  dueDate?: string
  projectContext?: string
  subtasks?: string[]
}

interface EmailData {
  from: string
  subject: string
  body: string
}

interface DocumentData {
  filename: string
  content: string
  type: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, data } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let result

    switch (action) {
      case 'process_email':
        result = await processEmail(data as EmailData, supabase)
        break
      case 'process_document':
        result = await processDocument(data as DocumentData, supabase)
        break
      default:
        // Default to processing a document if no action specified
        result = await processDocument(data as DocumentData, supabase)
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function processEmail(email: EmailData, supabase: any) {
  // Extract tasks from email using OpenAI
  const tasks = await extractTasksFromContent(
    `Email from: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`,
    'email'
  )

  const createdTasks = []

  console.log('Extracted tasks:', JSON.stringify(tasks, null, 2))

  for (const task of tasks) {
    console.log('Processing task:', task.title, 'with skills:', task.requiredSkills)
    
    // Find or create project based on email context
    const project = await findOrCreateProject(task.projectContext || email.subject, supabase)
    
    // Get StrideShift organization
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', 'StrideShift')
      .single()

    if (!org) {
      console.error('StrideShift organization not found')
      continue
    }

    // Find best team member for the task
    const assignee = await findBestAssignee(task.requiredSkills, org.id, supabase)
    console.log('Assignee result:', JSON.stringify(assignee, null, 2))

    // Create main task
    const { data: mainTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'todo',
        project_id: project.id,
        estimated_hours: task.estimatedHours,
        due_date: task.dueDate,
        created_by: assignee?.id || null
      })
      .select()
      .single()

    if (taskError) {
      console.error('Error creating task:', taskError)
      continue
    }

    // If we have an assignee with a profile, create assignment
    if (assignee?.id) {
      await supabase
        .from('task_assignees')
        .insert({
          task_id: mainTask.id,
          user_id: assignee.id,
          assigned_at: new Date().toISOString()
        })
    }

    // Store assignment info in metadata
    const metadata = {
      source: 'email',
      from: email.from,
      requiredSkills: task.requiredSkills,
      autoAssigned: !!assignee,
      assignedTo: assignee?.name || null,
      assignedEmail: assignee?.email || null
    }
    
    console.log('Storing metadata:', JSON.stringify(metadata, null, 2))

    const { error: metadataError } = await supabase
      .from('tasks')
      .update({ metadata })
      .eq('id', mainTask.id)
    
    if (metadataError) {
      console.error('Error updating metadata:', metadataError)
    }

    // Create subtasks if needed
    if (task.subtasks && task.subtasks.length > 0) {
      for (const subtaskTitle of task.subtasks) {
        await supabase
          .from('tasks')
          .insert({
            title: subtaskTitle,
            description: `Subtask of: ${task.title}`,
            priority: 'medium',
            status: 'todo',
            project_id: project.id,
            parent_task_id: mainTask.id,
            estimated_hours: Math.ceil(task.estimatedHours / task.subtasks.length),
            created_by: assignee?.id || null
          })
      }
    }

    createdTasks.push({
      ...mainTask,
      metadata: metadata,
      assignedTo: assignee?.name || 'Unassigned',
      assignedEmail: assignee?.email || null
    })
  }

  return {
    message: `Processed email and created ${createdTasks.length} tasks`,
    tasks: createdTasks
  }
}

async function processDocument(doc: DocumentData, supabase: any) {
  // Extract tasks from document using OpenAI
  const tasks = await extractTasksFromContent(doc.content, 'document')

  const createdTasks = []

  for (const task of tasks) {
    // Get StrideShift organization
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', 'StrideShift')
      .single()

    if (!org) {
      console.error('StrideShift organization not found')
      continue
    }

    // Find or create project
    const project = await findOrCreateProject(
      task.projectContext || doc.filename.replace(/\.[^/.]+$/, ''),
      supabase,
      org.id
    )

    // Find best team member
    const assignee = await findBestAssignee(task.requiredSkills, org.id, supabase)

    // Create the task
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'todo',
        project_id: project.id,
        estimated_hours: task.estimatedHours,
        due_date: task.dueDate,
        created_by: assignee?.id || null
      })
      .select()
      .single()

    if (!taskError && newTask) {
      // Store assignment info in metadata
      const metadata = {
        source: 'document',
        filename: doc.filename,
        requiredSkills: task.requiredSkills,
        autoAssigned: !!assignee,
        assignedTo: assignee?.name || null,
        assignedEmail: assignee?.email || null
      }

      await supabase
        .from('tasks')
        .update({ metadata })
        .eq('id', newTask.id)

      // If assignee has a profile, create assignment
      if (assignee?.id) {
        await supabase
          .from('task_assignees')
          .insert({
            task_id: newTask.id,
            user_id: assignee.id,
            assigned_at: new Date().toISOString()
          })

        // Create notification
        await supabase
          .from('notifications')
          .insert({
            user_id: assignee.id,
            title: 'New Task Assigned',
            message: `You've been assigned: ${task.title}`,
            type: 'task_assigned',
            metadata: { task_id: newTask.id }
          })
      }

      createdTasks.push({
        ...newTask,
        assignedTo: assignee?.name || 'Unassigned',
        assignedEmail: assignee?.email || null
      })
    }
  }

  return {
    message: `Successfully created ${createdTasks.length} tasks from document`,
    tasks: createdTasks,
    extractedCount: tasks.length
  }
}

async function extractTasksFromContent(content: string, contentType: string): Promise<ExtractedTask[]> {
  // Enhanced prompt with StrideShift team context
  const systemPrompt = `You are an AI assistant that extracts actionable tasks from ${contentType}s for the StrideShift development team.
  
  Our team includes:
  - Kiyasha Singh & Kiyasha Naidoo (Product Management, QA)
  - Fanyana Dlamini & Fanyana Nkosi (Full Stack & Frontend Development - React, TypeScript, Node.js)
  - Johannes van der Merwe (Backend Engineering - PostgreSQL, Python, APIs)
  - Lynne Peterson & Lynne Hofmeyr (Design & Development)
  - And other specialists in Data, Infrastructure, Documentation, etc.
  
  For each task, determine:
  - A clear, actionable title
  - Detailed description of what needs to be done
  - Priority: critical (urgent/blocking), high (important), medium (normal), low (nice-to-have)
  - Due date (if mentioned or implied - calculate from phrases like "by Friday", "next week", etc.)
  - Estimated hours (be realistic: small tasks 1-4h, medium 4-8h, large 8-16h, very large 16+h)
  - requiredSkills: array of skills from [typescript, javascript, react, nodejs, python, postgresql, docker, kubernetes, aws, testing, api, documentation, technical-writing, api-documentation, figma, ux-research, frontend, backend, java, spring-boot, mongodb, ci-cd, microservices, sql, spark, airflow, data-pipelines, etl, big-data, agile, scrum, kanban, product-strategy, user-research, automation, selenium, cypress, api-testing, performance-testing, security-testing, react-native, flutter, ios, android, mobile-testing, terraform, cloud-architecture, security, cost-optimization, azure, gcp]
  - Project context (what project/feature this relates to)
  - Subtasks if the main task should be broken down (for tasks > 8 hours)
  
  Rules:
  - Only extract ACTUAL tasks that require action, not general information
  - If people are mentioned by name, note them but let the system assign based on skills
  - Parse relative dates (today is ${new Date().toISOString().split('T')[0]})
  - Match skills precisely to enable proper team assignment
  - Break complex tasks into subtasks
  - If no clear tasks exist, return empty array
  
  Return as JSON with this exact structure:
  {
    "tasks": [
      {
        "title": "string",
        "description": "string",
        "priority": "critical|high|medium|low",
        "estimatedHours": number,
        "requiredSkills": ["skill1", "skill2"],
        "dueDate": "YYYY-MM-DD or null",
        "projectContext": "string or null",
        "subtasks": ["subtask1", "subtask2"] or []
      }
    ]
  }`

  const userPrompt = `Extract actionable tasks from this content:\n\n${content}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const resultContent = data.choices[0].message.content
    console.log('OpenAI Response:', resultContent)
    const result = JSON.parse(resultContent)
    
    // Log the extracted tasks
    console.log('Parsed tasks:', JSON.stringify(result.tasks, null, 2))
    
    // Ensure we return an array of tasks
    return result.tasks || []
  } catch (error) {
    console.error('Failed to extract tasks:', error)
    return []
  }
}

async function findBestAssignee(requiredSkills: string[], organizationId: string, supabase: any) {
  console.log('Finding assignee for skills:', requiredSkills, 'in org:', organizationId)
  
  if (!requiredSkills || requiredSkills.length === 0) {
    console.log('No skills provided, returning null')
    return null
  }

  // Use the correct allocation function for team_members table
  console.log('Calling RPC with params:', {
    task_requirements: requiredSkills,
    required_skill_level: 5,
    org_id: organizationId
  })
  
  const { data, error } = await supabase.rpc('allocate_task_to_team_member', {
    task_requirements: requiredSkills,
    required_skill_level: 5,
    org_id: organizationId
  })

  console.log('RPC Response - data:', JSON.stringify(data), 'error:', JSON.stringify(error))

  if (error) {
    console.error('Error finding assignee:', error)
    return null
  }

  // The RPC function returns an array with one item (or empty array)
  if (!data || (Array.isArray(data) && data.length === 0)) {
    console.log('No matching team member found (empty result)')
    return null
  }
  
  // Get the first (and only) result from the array
  const result = Array.isArray(data) ? data[0] : data
  
  if (!result || !result.member_name) {
    console.log('No valid team member data found')
    return null
  }
  
  console.log('Found team member data:', JSON.stringify(result, null, 2))

  // The function now returns user_id directly
  const member = {
    id: result.user_id,  // Use the user_id from the RPC function
    name: result.member_name,
    email: result.member_email,
    jobTitle: result.job_title,
    department: result.department,
    skillMatchCount: result.skill_match_count
  }
  
  console.log('Found team member with user account:', member)
  
  // Only return if we have a valid user_id
  if (!member.id) {
    console.log('Team member does not have a user account yet')
    return null
  }

  console.log(`Assigned to ${member.name} (${member.jobTitle}) based on ${member.skillMatchCount} matching skills`)
  return member
}

async function findOrCreateProject(projectName: string, supabase: any, organizationId?: string) {
  // Clean up project name
  const cleanName = projectName
    .replace(/^(Re:|Fwd:|Fw:)\s*/gi, '')
    .trim()
    .substring(0, 100)

  // If we have an org ID, look for projects in that org
  let query = supabase
    .from('projects')
    .select('id, name')

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  // Try to find existing project
  const { data: existing } = await query
    .ilike('name', `%${cleanName.split(' ')[0]}%`)
    .limit(1)
    .single()

  if (existing) {
    return existing
  }

  // Create new project
  const projectData: any = {
    name: cleanName || 'General Tasks',
    description: `Auto-created from ${projectName}`,
    status: 'active'
  }

  if (organizationId) {
    projectData.organization_id = organizationId
  }

  const { data: newProject, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error)
    // Return a default project or handle error appropriately
    const { data: defaultProject } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)
      .single()
    
    return defaultProject
  }

  return newProject
}