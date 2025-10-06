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
  user_id: string
  role: 'admin' | 'manager' | 'member' | 'guest'
  joined_at: string
  user?: {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
    department?: string
    job_title?: string
    expertise?: string[]
    is_ai_agent?: boolean
  }
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
        .from('organization_members')
        .select('*, user:profiles!user_id(*)')
        .eq('organization_id', organizationId)
        .order('joined_at', { ascending: true })

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
    const user = member.user
    if (!user) return false
    return (
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchQuery.toLowerCase())
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
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.filter(m => m.role === 'member').length}
            </div>
            <p className="text-xs text-muted-foreground">Regular members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.filter(m => m.role === 'admin').length}
            </div>
            <p className="text-xs text-muted-foreground">Admin users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.filter(m => m.role === 'manager').length}
            </div>
            <p className="text-xs text-muted-foreground">Manager users</p>
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
              {filteredTeamMembers.map((member) => {
                const user = member.user
                if (!user) return null

                const initials = user.full_name
                  ? getInitials(user.full_name)
                  : user.email.charAt(0).toUpperCase()

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.full_name || user.email}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDepartmentIcon(user.department || '')}
                        <span>{user.job_title || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.department || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.expertise?.slice(0, 3).map(skill => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {user.expertise && user.expertise.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.expertise.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.role === 'admin' ? 'default' : member.role === 'manager' ? 'secondary' : 'outline'}
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
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