'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  Split,
  CalendarDays,
  User
} from 'lucide-react'
import { TeamAllocationService, TeamMember, AllocationSuggestion } from '@/lib/api/team-allocation'
import { format } from 'date-fns'

interface TeamAllocationPanelProps {
  taskId?: string
  taskTitle?: string
  requiredSkills?: string[]
  estimatedHours?: number
  organizationId: string
}

export function TeamAllocationPanel({
  taskId,
  taskTitle,
  requiredSkills = [],
  estimatedHours = 0,
  organizationId
}: TeamAllocationPanelProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [suggestions, setSuggestions] = useState<AllocationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [dateInput, setDateInput] = useState('')
  const [parsedDates, setParsedDates] = useState<{ date: Date; context: string }[]>([])
  const [workloadData, setWorkloadData] = useState<any[]>([])

  const allocationService = new TeamAllocationService()

  useEffect(() => {
    if (organizationId) {
      loadTeamMembers()
      loadWorkloadDistribution()
    }
  }, [organizationId])

  useEffect(() => {
    if (requiredSkills.length > 0) {
      getSuggestions()
    }
  }, [requiredSkills])

  const loadTeamMembers = async () => {
    try {
      console.log('Loading team members for org:', organizationId)
      const members = await allocationService.getTeamMembers(organizationId)
      console.log('Loaded team members:', members)
      setTeamMembers(members)
    } catch (error) {
      console.error('Failed to load team members:', error)
    }
  }

  const loadWorkloadDistribution = async () => {
    try {
      const data = await allocationService.getWorkloadDistribution(organizationId)
      setWorkloadData(data)
    } catch (error) {
      console.error('Failed to load workload distribution:', error)
    }
  }

  const getSuggestions = async () => {
    if (requiredSkills.length === 0) return
    
    setLoading(true)
    try {
      const suggested = await allocationService.suggestTeamForTask(requiredSkills, 5, organizationId)
      setSuggestions(suggested)
    } catch (error) {
      console.error('Failed to get suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const autoAssignTask = async () => {
    if (!taskId || requiredSkills.length === 0) return

    setLoading(true)
    try {
      const result = await allocationService.autoAssignTask(taskId, requiredSkills, organizationId)
      if (result.success) {
        alert(`Success! ${result.message}`)
        // Refresh suggestions
        getSuggestions()
      } else {
        alert(`Failed: ${result.message}`)
      }
    } catch (error) {
      console.error('Failed to auto-assign task:', error)
    } finally {
      setLoading(false)
    }
  }

  const chunkTask = async () => {
    if (!taskId || !estimatedHours) return

    setLoading(true)
    try {
      const chunks = await allocationService.chunkTask(taskId, 4)
      alert(`Task split into ${chunks.length} subtasks`)
    } catch (error) {
      console.error('Failed to chunk task:', error)
    } finally {
      setLoading(false)
    }
  }

  const parseDateInput = () => {
    if (!dateInput) return
    const dates = allocationService.parseDatesFromText(dateInput)
    setParsedDates(dates)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'unavailable': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Task Info & Actions */}
      {taskId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Smart Task Management
            </CardTitle>
            <CardDescription>
              {taskTitle || 'Current Task'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={autoAssignTask} 
                disabled={loading || requiredSkills.length === 0}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Auto-Assign Task
              </Button>
              
              {estimatedHours > 4 && (
                <Button 
                  onClick={chunkTask}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Split className="h-4 w-4" />
                  Split into Subtasks
                </Button>
              )}
            </div>

            {requiredSkills.length > 0 && (
              <div>
                <Label>Required Skills</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {requiredSkills.map(skill => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recommended Team Members
            </CardTitle>
            <CardDescription>
              Based on skills and availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div 
                  key={suggestion.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(suggestion.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{suggestion.full_name}</div>
                      <div className="text-sm text-gray-500">{suggestion.job_title}</div>
                      <div className="flex gap-1 mt-1">
                        {suggestion.matching_skills.slice(0, 3).map(skill => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {suggestion.matching_skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{suggestion.matching_skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      Skill Match: <span className="font-medium">{Math.round(suggestion.skill_score)}/10</span>
                    </div>
                    <div className="text-sm">
                      Availability: <span className="font-medium">{Math.round(suggestion.availability_score * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Parser */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Smart Date Recognition
          </CardTitle>
          <CardDescription>
            Enter text with dates to parse them automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., 'Complete by tomorrow', 'Meeting next Monday', 'Due in 3 days'"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && parseDateInput()}
            />
            <Button onClick={parseDateInput}>
              Parse Dates
            </Button>
          </div>

          {parsedDates.length > 0 && (
            <div className="space-y-2">
              <Label>Recognized Dates:</Label>
              {parsedDates.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {format(item.date, 'EEEE, MMMM d, yyyy')}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({item.context})
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Strideshift Team
          </CardTitle>
          <CardDescription>
            {teamMembers.length} team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamMembers.map(member => (
              <div 
                key={member.id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <Avatar>
                  <AvatarFallback>
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{member.name}</div>
                  <div className="text-sm text-gray-500">{member.job_title}</div>
                  <div className="text-xs text-gray-400">{member.department}</div>
                </div>
                {member.is_ai_agent && (
                  <Badge variant="secondary" className="text-xs">
                    AI Agent
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workload Distribution */}
      {workloadData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Workload Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workloadData.map(person => (
                <div key={person.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{person.full_name}</span>
                    <span className="text-gray-500">
                      {person.current_workload}/{person.work_capacity} hours
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        person.workload_percentage > 80 
                          ? 'bg-red-500' 
                          : person.workload_percentage > 60 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(person.workload_percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}