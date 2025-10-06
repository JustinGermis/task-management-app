'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  Search,
  Mail,
  Shield,
  Clock,
  UserPlus,
  Briefcase,
  Code
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TeamMember {
  id: string
  name: string
  email: string
  job_title: string
  department: string
  expertise: string[]
  is_ai_agent?: boolean
}

interface ProfileMember {
  id: string
  user_id: string
  role: 'admin' | 'manager' | 'member' | 'guest'
  joined_at: string
  user?: {
    id: string
    email: string
    full_name?: string
    job_title?: string
    department?: string
    expertise?: string[]
  }
}

export function StrideshiftTeamManager() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [profileMembers, setProfileMembers] = useState<ProfileMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState<string>('')
  
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Get StrideShift organization
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', 'StrideShift')
        .single()

      if (!org) {
        console.error('StrideShift organization not found')
        setIsLoading(false)
        return
      }

      setOrganizationId(org.id)

      // Load team_members table data
      const { data: teamData } = await supabase
        .from('team_members')
        .select('*')
        .eq('organization_id', org.id)
        .order('department', { ascending: true })
        .order('name', { ascending: true })

      setTeamMembers(teamData || [])

      // Load organization_members with profiles
      const { data: profileData } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles!inner (
            id,
            email,
            full_name,
            job_title,
            department,
            expertise
          )
        `)
        .eq('organization_id', org.id)

      // Transform the data
      const transformedProfiles = (profileData || []).map(member => ({
        ...member,
        user: member.profiles ? {
          id: member.profiles.id,
          email: member.profiles.email,
          full_name: member.profiles.full_name,
          job_title: member.profiles.job_title,
          department: member.profiles.department,
          expertise: member.profiles.expertise
        } : undefined
      }))

      setProfileMembers(transformedProfiles)
    } catch (error) {
      console.error('Failed to load data:', error)
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'manager': return 'default'
      case 'member': return 'secondary'
      case 'guest': return 'outline'
      default: return 'outline'
    }
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

  const filteredProfileMembers = profileMembers.filter(member => {
    if (!searchQuery) return true
    const user = member.user
    if (!user) return false
    return (
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Strideshift Team</h1>
          <p className="text-muted-foreground mt-2">
            Manage your team members across both systems
          </p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Team Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Team</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">Team members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Profiles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profileMembers.length}</div>
            <p className="text-xs text-muted-foreground">Full access</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Setup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.length - profileMembers.length}
            </div>
            <p className="text-xs text-muted-foreground">Need profiles</p>
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
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Team Members Table (from team_members table) */}
      <Card>
        <CardHeader>
          <CardTitle>All Team Members</CardTitle>
          <CardDescription>
            Complete list of {teamMembers.length} Strideshift team members
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
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeamMembers.map((member) => {
                const hasProfile = profileMembers.some(p => p.user?.email === member.email)
                
                return (
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
                      {hasProfile ? (
                        <Badge variant="default" className="bg-green-500">
                          <Mail className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Pending
                        </Badge>
                      )}
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

      {/* Active Profile Members (can log in) */}
      {profileMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Members</CardTitle>
            <CardDescription>
              Team members with full system access ({profileMembers.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProfileMembers.map((member) => {
                const user = member.user
                if (!user) return null
                
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(user.full_name || user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.full_name || user.email}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.job_title || 'Team Member'}
                        </div>
                      </div>
                    </div>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Team Member Status</h3>
              <p className="text-sm text-blue-800 mt-1">
                You have {teamMembers.length} team members registered in the system.
                {profileMembers.length > 0 && ` ${profileMembers.length} have active profiles and can log in.`}
                {teamMembers.length > profileMembers.length && 
                  ` ${teamMembers.length - profileMembers.length} members are pending profile creation.`}
              </p>
              <p className="text-sm text-blue-700 mt-2">
                Team members without profiles can still be assigned tasks through the AI allocation system.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}