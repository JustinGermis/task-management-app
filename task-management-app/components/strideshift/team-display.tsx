'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email: string
  job_title: string
  department: string
  expertise: string[]
  is_ai_agent: boolean
}

export function StrideshiftTeamDisplay() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const loadTeamMembers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // First get the StrideShift organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', 'StrideShift')
        .single()

      if (orgError) {
        throw new Error('StrideShift organization not found')
      }

      // Then get all team members
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('organization_id', org.id)
        .order('department')
        .order('name')

      if (membersError) {
        throw membersError
      }

      setTeamMembers(members || [])
      console.log(`Loaded ${members?.length || 0} team members for Strideshift`)
    } catch (err: any) {
      console.error('Error loading team members:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeamMembers()
  }, [])

  const departmentColors: { [key: string]: string } = {
    'Engineering': 'bg-blue-100 text-blue-800',
    'Product': 'bg-purple-100 text-purple-800',
    'Design': 'bg-pink-100 text-pink-800',
    'Quality Assurance': 'bg-green-100 text-green-800',
    'Data': 'bg-yellow-100 text-yellow-800',
    'Documentation': 'bg-gray-100 text-gray-800',
    'Infrastructure': 'bg-indigo-100 text-indigo-800'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p>Loading Strideshift team members...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading team members</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={loadTeamMembers} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const groupedMembers = teamMembers.reduce((acc, member) => {
    const dept = member.department || 'Other'
    if (!acc[dept]) acc[dept] = []
    acc[dept].push(member)
    return acc
  }, {} as Record<string, TeamMember[]>)

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Strideshift Team Overview
            </span>
            <Button size="sm" variant="outline" onClick={loadTeamMembers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Total of {teamMembers.length} team members across {Object.keys(groupedMembers).length} departments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(groupedMembers).map(([dept, members]) => (
              <div key={dept} className="text-center">
                <div className="text-2xl font-bold">{members.length}</div>
                <div className="text-sm text-gray-600">{dept}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Team List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            All Strideshift team members with their skills and roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedMembers).map(([dept, members]) => (
              <div key={dept}>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Badge className={departmentColors[dept] || 'bg-gray-100 text-gray-800'}>
                    {dept}
                  </Badge>
                  <span className="text-sm text-gray-500">({members.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {members.map((member) => (
                    <div key={member.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-gray-600">{member.job_title}</div>
                          <div className="text-xs text-gray-500">{member.email}</div>
                        </div>
                        {member.is_ai_agent && (
                          <Badge variant="secondary" className="text-xs">AI</Badge>
                        )}
                      </div>
                      {member.expertise && member.expertise.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {member.expertise.map((skill) => (
                            <span key={skill} className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      {teamMembers.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <div className="font-medium text-green-800">Team loaded successfully!</div>
            <div className="text-sm text-green-700">
              All {teamMembers.length} Strideshift team members are available for task allocation
            </div>
          </div>
        </div>
      )}
    </div>
  )
}