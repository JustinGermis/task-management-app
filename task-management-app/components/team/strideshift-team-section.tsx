'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Users, 
  Code,
  Briefcase,
  Mail,
  UserCheck
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface TeamMember {
  id: string
  name: string
  email: string
  job_title: string
  department: string
  expertise: string[]
  is_ai_agent?: boolean
}

interface StrideshiftTeamSectionProps {
  organizationId: string
  searchQuery: string
}

export function StrideshiftTeamSection({ organizationId, searchQuery }: StrideshiftTeamSectionProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadTeamMembers()
  }, [organizationId])

  const loadTeamMembers = async () => {
    try {
      const { data: teamData } = await supabase
        .from('team_members')
        .select('*')
        .eq('organization_id', organizationId)
        .order('department', { ascending: true })
        .order('name', { ascending: true })

      setTeamMembers(teamData || [])
    } catch (error) {
      console.error('Failed to load team members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getDepartmentIcon = (dept: string) => {
    if (dept?.includes('Engineering')) return <Code className="h-4 w-4" />
    if (dept?.includes('Product')) return <Briefcase className="h-4 w-4" />
    return <Users className="h-4 w-4" />
  }

  const filteredTeamMembers = teamMembers.filter(member => {
    if (!searchQuery) return true
    return (
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.department?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      {/* Stats for StrideShift Team */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Team</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">All members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(teamMembers.map(m => m.department)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique depts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engineers</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.filter(m => m.department?.includes('Engineering')).length}
            </div>
            <p className="text-xs text-muted-foreground">Dev team</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Agents</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.filter(m => m.is_ai_agent).length}
            </div>
            <p className="text-xs text-muted-foreground">Automated</p>
          </CardContent>
        </Card>
      </div>

      {/* StrideShift Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>StrideShift Team Members</CardTitle>
          <CardDescription>
            Complete team roster with {teamMembers.length} members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role/Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDepartmentIcon(member.department)}
                      <span>{member.job_title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{member.department}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.expertise?.slice(0, 3).map(skill => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {member.expertise && member.expertise.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.expertise.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.is_ai_agent ? (
                      <Badge variant="secondary">AI Agent</Badge>
                    ) : (
                      <Badge variant="default">
                        <Mail className="h-3 w-3 mr-1" />
                        Human
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredTeamMembers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No members found matching your search' : 'No team members yet'}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}