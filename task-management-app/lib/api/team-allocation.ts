import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export interface TeamMember {
  id: string
  name: string
  email: string
  job_title: string
  department: string
  expertise: string[]
  is_ai_agent: boolean
  ai_capabilities?: string[]
}

export interface AllocationSuggestion {
  user_id: string
  full_name: string
  job_title: string
  matching_skills: string[]
  skill_score: number
  availability_score: number
}

export interface TaskChunk {
  id: string
  title: string
  description: string
  estimated_hours: number
  parent_task_id: string
}

export class TeamAllocationService {
  private supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  /**
   * Get all team members from an organization
   */
  async getTeamMembers(organizationId: string): Promise<TeamMember[]> {
    const { data, error } = await this.supabase
      .from('team_members')
      .select('*')
      .eq('organization_id', organizationId)
      .order('department', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Suggest best team members for a task based on required skills
   */
  async suggestTeamForTask(
    requiredSkills: string[],
    teamSize: number = 3,
    organizationId?: string
  ): Promise<AllocationSuggestion[]> {
    // Get org ID if not provided
    let orgId = organizationId
    if (!orgId) {
      const { data: org } = await this.supabase
        .from('organizations')
        .select('id')
        .eq('name', 'StrideShift')
        .single()
      orgId = org?.id
    }

    const { data, error } = await this.supabase.rpc('suggest_team_members_for_task', {
      required_skills: requiredSkills,
      team_size: teamSize,
      org_id: orgId || null
    })

    if (error) throw error
    
    // Map the response to our interface
    return (data || []).map((item: any) => ({
      user_id: item.member_id,
      full_name: item.member_name,
      job_title: item.job_title,
      matching_skills: item.matching_skills || [],
      skill_score: item.match_score || 0,
      availability_score: 1.0 // Team members don't have workload tracking yet
    }))
  }

  /**
   * Allocate a task to the most suitable team member
   */
  async allocateTaskToUser(
    taskRequirements: string[],
    organizationId?: string
  ): Promise<{ id: string; name: string; email: string } | null> {
    // Get org ID if not provided
    let orgId = organizationId
    if (!orgId) {
      const { data: org } = await this.supabase
        .from('organizations')
        .select('id')
        .eq('name', 'StrideShift')
        .single()
      orgId = org?.id
    }

    const { data, error } = await this.supabase.rpc('allocate_task_to_team_member', {
      task_requirements: taskRequirements,
      required_skill_level: 5,
      org_id: orgId || null
    })

    if (error) {
      console.error('Allocation error:', error)
      return null
    }

    if (data) {
      // The function returns a single record, not an array
      return {
        id: data.member_id,
        name: data.member_name,
        email: data.member_email
      }
    }

    return null
  }

  /**
   * Chunk a large task into smaller subtasks
   */
  async chunkTask(
    taskId: string,
    chunkSize: number = 4
  ): Promise<string[]> {
    const { data, error } = await this.supabase.rpc('chunk_task', {
      task_id: taskId,
      chunk_size: chunkSize
    })

    if (error) throw error
    return data || []
  }

  /**
   * Get tasks for a specific date range
   */
  async getTasksForDateRange(
    startDate?: Date,
    endDate?: Date
  ) {
    const start = startDate || new Date()
    const end = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

    const { data, error } = await this.supabase.rpc('get_tasks_for_date_range', {
      start_date: start.toISOString(),
      end_date: end.toISOString()
    })

    if (error) throw error
    return data || []
  }

  /**
   * Parse dates from text using various formats
   */
  parseDatesFromText(text: string): { date: Date; context: string }[] {
    const results: { date: Date; context: string }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Common date patterns
    const patterns = [
      // ISO format: 2024-12-25
      /(\d{4}-\d{2}-\d{2})/g,
      // US format: 12/25/2024 or 12-25-2024
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
      // Relative dates
      /(today|tomorrow|yesterday)/gi,
      // Day names
      /(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
      // In X days
      /in\s+(\d+)\s+days?/gi,
      // End of week/month
      /(end of|eow|eom)\s*(week|month)?/gi
    ]

    // Check for relative dates
    if (/today/i.test(text)) {
      results.push({ date: new Date(today), context: 'Referenced as "today"' })
    }
    if (/tomorrow/i.test(text)) {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      results.push({ date: tomorrow, context: 'Referenced as "tomorrow"' })
    }
    if (/yesterday/i.test(text)) {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      results.push({ date: yesterday, context: 'Referenced as "yesterday"' })
    }

    // Check for "in X days"
    const inDaysMatch = text.match(/in\s+(\d+)\s+days?/i)
    if (inDaysMatch) {
      const days = parseInt(inDaysMatch[1])
      const futureDate = new Date(today)
      futureDate.setDate(futureDate.getDate() + days)
      results.push({ date: futureDate, context: `In ${days} day(s)` })
    }

    // Check for day names
    const dayNameMatch = text.match(/(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)
    if (dayNameMatch) {
      const nextOrThis = dayNameMatch[1].toLowerCase()
      const dayName = dayNameMatch[2].toLowerCase()
      const targetDate = this.getNextDayOfWeek(dayName, nextOrThis === 'next')
      results.push({ date: targetDate, context: `${dayNameMatch[0]}` })
    }

    // Check for ISO dates
    const isoMatches = text.match(/\d{4}-\d{2}-\d{2}/g)
    if (isoMatches) {
      isoMatches.forEach(match => {
        try {
          const date = new Date(match)
          if (!isNaN(date.getTime())) {
            results.push({ date, context: `ISO date: ${match}` })
          }
        } catch (e) {
          // Invalid date, skip
        }
      })
    }

    // Check for US format dates
    const usMatches = text.matchAll(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g)
    for (const match of usMatches) {
      try {
        const date = new Date(`${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`)
        if (!isNaN(date.getTime())) {
          results.push({ date, context: `US date: ${match[0]}` })
        }
      } catch (e) {
        // Invalid date, skip
      }
    }

    // Check for end of week/month
    if (/end of week|eow/i.test(text)) {
      const endOfWeek = new Date(today)
      const daysUntilFriday = 5 - today.getDay()
      endOfWeek.setDate(today.getDate() + (daysUntilFriday >= 0 ? daysUntilFriday : 7 + daysUntilFriday))
      results.push({ date: endOfWeek, context: 'End of week (Friday)' })
    }

    if (/end of month|eom/i.test(text)) {
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      results.push({ date: endOfMonth, context: 'End of month' })
    }

    return results
  }

  /**
   * Get the next occurrence of a specific day of the week
   */
  private getNextDayOfWeek(dayName: string, skipThisWeek: boolean = false): Date {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const targetDay = days.indexOf(dayName.toLowerCase())
    
    if (targetDay === -1) {
      throw new Error(`Invalid day name: ${dayName}`)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const currentDay = today.getDay()
    
    let daysToAdd = targetDay - currentDay
    if (daysToAdd <= 0 || skipThisWeek) {
      daysToAdd += 7
    }

    const result = new Date(today)
    result.setDate(today.getDate() + daysToAdd)
    return result
  }

  /**
   * Calculate workload distribution across team
   */
  async getWorkloadDistribution(organizationId: string) {
    // For StrideShift, use team_members table
    const { data: org } = await this.supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()
    
    if (org?.name === 'StrideShift') {
      // Return mock workload data for StrideShift team
      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select('*')
        .eq('organization_id', organizationId)
      
      return (teamMembers || []).map(member => ({
        id: member.id,
        full_name: member.name,
        current_workload: Math.floor(Math.random() * 30),
        work_capacity: 40,
        workload_percentage: Math.floor(Math.random() * 100)
      }))
    }
    
    // For other orgs, use profiles
    const { data: profiles, error } = await this.supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        job_title,
        department,
        work_capacity,
        current_workload,
        availability_status
      `)
      .eq('organization_id', organizationId)

    if (error) throw error

    return (profiles || []).map(profile => ({
      ...profile,
      workload_percentage: profile.work_capacity > 0 
        ? (profile.current_workload / profile.work_capacity) * 100 
        : 0,
      available_hours: profile.work_capacity - profile.current_workload
    }))
  }

  /**
   * Auto-assign task based on skills and availability
   */
  async autoAssignTask(
    taskId: string,
    requiredSkills: string[],
    organizationId?: string
  ): Promise<{ success: boolean; assignedTo?: string; message: string }> {
    try {
      // Find the best team member for the task
      const member = await this.allocateTaskToUser(requiredSkills, organizationId)
      
      if (!member) {
        return { 
          success: false, 
          message: 'No suitable team member found with required skills' 
        }
      }

      // Check if this team member has a profile (for assignment)
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('email', member.email)
        .single()

      if (profile) {
        // Create task assignment with profile
        const { error } = await this.supabase
          .from('task_assignees')
          .insert({
            task_id: taskId,
            user_id: profile.id,
            assigned_at: new Date().toISOString()
          })

        if (error) throw error
      } else {
        // Update the task metadata with assignment info
        const { data: task } = await this.supabase
          .from('tasks')
          .select('metadata')
          .eq('id', taskId)
          .single()
        
        const updatedMetadata = {
          ...(task?.metadata || {}),
          auto_assigned_to: member.name,
          assigned_email: member.email,
          assigned_at: new Date().toISOString()
        }
        
        const { error } = await this.supabase
          .from('tasks')
          .update({ metadata: updatedMetadata })
          .eq('id', taskId)

        if (error) console.error('Could not update task:', error)
      }

      return { 
        success: true, 
        assignedTo: member.name,
        message: `Task successfully assigned to ${member.name}` 
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to auto-assign task: ${error}` 
      }
    }
  }
}