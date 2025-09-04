'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Building, 
  Users, 
  Calendar, 
  Settings,
  Plus,
  FolderOpen,
  Mail,
  Shield,
  UserCheck,
  UserX
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OrganizationWithDetails, AuthUser, UserRole } from '@/lib/types'
import { formatDate, pluralize } from '@/lib/utils'
import { removeMember, updateMemberRole } from '@/lib/api/organizations'

interface OrganizationDetailsProps {
  organization: OrganizationWithDetails
  currentUser: AuthUser
}

export function OrganizationDetails({ organization, currentUser }: OrganizationDetailsProps) {
  const [members, setMembers] = useState(organization.members || [])
  
  const currentMember = members.find(m => m.profiles?.id === currentUser.id)
  const isAdmin = currentMember?.role === 'admin'
  const isManager = currentMember?.role === 'manager'
  const canManageMembers = isAdmin || isManager

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    
    try {
      await removeMember(organization.id, userId)
      setMembers(members.filter(m => m.profiles?.id !== userId))
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateMemberRole(organization.id, userId, newRole)
      setMembers(members.map(m => 
        m.profiles?.id === userId 
          ? { ...m, role: newRole }
          : m
      ))
    } catch (error) {
      console.error('Failed to update member role:', error)
    }
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return Shield
      case 'manager': return UserCheck
      default: return Users
    }
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'manager': return 'default'
      default: return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Building className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold">{organization.name}</h1>
          </div>
          {organization.description && (
            <p className="text-lg text-muted-foreground">{organization.description}</p>
          )}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Created {formatDate(organization.created_at!)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{members.length} members</span>
            </div>
          </div>
        </div>
        
        {isAdmin && (
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <Link href={`/organizations/${organization.id}/edit`}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/organizations/${organization.id}/invite`}>
                <Mail className="mr-2 h-4 w-4" />
                Invite Members
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <FolderOpen className="h-5 w-5" />
                  <span>Projects</span>
                </CardTitle>
                <CardDescription>
                  {organization.projects?.length || 0} projects in this organization
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/projects/new?organization=${organization.id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {organization.projects && organization.projects.length > 0 ? (
              <div className="space-y-3">
                {organization.projects.slice(0, 5).map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div>
                      <Link 
                        href={`/projects/${project.id}`}
                        className="font-medium hover:underline"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDate(project.created_at!)}
                      </p>
                    </div>
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </div>
                ))}
                {organization.projects.length > 5 && (
                  <div className="pt-2">
                    <Button variant="ghost" size="sm" className="w-full" asChild>
                      <Link href={`/projects?organization=${organization.id}`}>
                        View All Projects ({organization.projects.length})
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No projects yet</p>
                <Button size="sm" asChild>
                  <Link href={`/projects/new?organization=${organization.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Project
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Members</span>
                </CardTitle>
                <CardDescription>
                  {pluralize(members.length, 'team member')} in this organization
                </CardDescription>
              </div>
              {canManageMembers && (
                <Button size="sm" asChild>
                  <Link href={`/organizations/${organization.id}/invite`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Invite
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => {
                const profile = member.profiles
                if (!profile) return null

                const RoleIcon = getRoleIcon(member.role || 'member')
                const initials = profile.full_name
                  ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                  : profile.email.charAt(0).toUpperCase()

                return (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {profile.full_name || profile.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profile.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getRoleBadgeVariant(member.role || 'member')}>
                        <RoleIcon className="mr-1 h-3 w-3" />
                        {member.role || 'member'}
                      </Badge>
                      
                      {canManageMembers && profile.id !== currentUser.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleUpdateRole(profile.id, 'member')}
                              disabled={member.role === 'member'}
                            >
                              Make Member
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleUpdateRole(profile.id, 'manager')}
                              disabled={member.role === 'manager'}
                            >
                              Make Manager
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem 
                                onClick={() => handleUpdateRole(profile.id, 'admin')}
                                disabled={member.role === 'admin'}
                              >
                                Make Admin
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleRemoveMember(profile.id)}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}