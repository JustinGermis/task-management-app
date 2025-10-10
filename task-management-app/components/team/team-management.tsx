'use client'

import { useState, useEffect } from 'react'
import { Plus, Mail, Shield, Users, Search, UserX, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import {
  getOrganizations,
  getOrganizationMembers,
  getCurrentUserProfile,
  getInvitations,
  updateMemberRole,
  removeMember,
  cancelInvitation,
  resendInvitation
} from '@/lib/api/simple-api'
import { formatRelativeTime } from '@/lib/utils'
import { InviteDialog } from '@/components/team/invite-dialog'
import { StrideshiftTeamSection } from '@/components/team/strideshift-team-section'
import { useDataCache } from '@/lib/contexts/data-cache-context'

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
  }
}

const CACHE_KEYS = {
  PROFILE: 'team:profile',
  ORGANIZATIONS: 'team:organizations',
  MEMBERS: (orgId: string) => `team:members:${orgId}`,
  INVITATIONS: (orgId: string) => `team:invitations:${orgId}`,
}

const DROPDOWN_KEY = 'global:selectedOrganizationId' // Shared across all pages

export function TeamManagement() {
  const cache = useDataCache()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>(() => {
    const saved = localStorage.getItem(DROPDOWN_KEY)
    return saved || ''
  })
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedOrgId) {
      loadMembers()
      loadInvitations()
      // Save selection to localStorage
      localStorage.setItem(DROPDOWN_KEY, selectedOrgId)
    }
  }, [selectedOrgId])

  const loadData = async () => {
    // Check cache first
    const cachedProfile = cache.get(CACHE_KEYS.PROFILE)
    const cachedOrgs = cache.get(CACHE_KEYS.ORGANIZATIONS)

    if (cachedProfile && !cache.isStale(CACHE_KEYS.PROFILE) &&
        cachedOrgs && !cache.isStale(CACHE_KEYS.ORGANIZATIONS)) {
      setCurrentUser(cachedProfile)
      setOrganizations(cachedOrgs)
      if (cachedOrgs.length > 0 && !selectedOrgId) {
        // Only set if there's no saved selection
        setSelectedOrgId(cachedOrgs[0].id)
      }
      setIsLoading(false)
      return
    }

    try {
      const [profile, orgs] = await Promise.all([
        getCurrentUserProfile(),
        getOrganizations()
      ])

      setCurrentUser(profile)
      setOrganizations(orgs)
      cache.set(CACHE_KEYS.PROFILE, profile)
      cache.set(CACHE_KEYS.ORGANIZATIONS, orgs)

      if (orgs.length > 0 && !selectedOrgId) {
        // Only set default if there's no saved selection
        setSelectedOrgId(orgs[0].id)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMembers = async () => {
    const cacheKey = CACHE_KEYS.MEMBERS(selectedOrgId)

    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && !cache.isStale(cacheKey)) {
      setMembers(cached)
      return
    }

    try {
      const data = await getOrganizationMembers(selectedOrgId)
      setMembers(data)
      cache.set(cacheKey, data)
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }

  const loadInvitations = async () => {
    const cacheKey = CACHE_KEYS.INVITATIONS(selectedOrgId)

    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && !cache.isStale(cacheKey)) {
      setInvitations(cached)
      return
    }

    try {
      const data = await getInvitations(selectedOrgId)
      setInvitations(data)
      cache.set(cacheKey, data)
    } catch (error) {
      console.error('Failed to load invitations:', error)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateMemberRole(memberId, newRole)
      cache.invalidate(CACHE_KEYS.MEMBERS(selectedOrgId))
      await loadMembers()
    } catch (error) {
      console.error('Failed to update role:', error)
      alert('Failed to update member role')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return
    try {
      await removeMember(memberId)
      cache.invalidate(CACHE_KEYS.MEMBERS(selectedOrgId))
      await loadMembers()
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert('Failed to remove member')
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelInvitation(inviteId)
      cache.invalidate(CACHE_KEYS.INVITATIONS(selectedOrgId))
      await loadInvitations()
    } catch (error) {
      console.error('Failed to cancel invitation:', error)
    }
  }

  const handleResendInvite = async (inviteId: string) => {
    try {
      await resendInvitation(inviteId)
      alert('Invitation resent successfully')
    } catch (error) {
      console.error('Failed to resend invitation:', error)
      alert('Failed to resend invitation')
    }
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

  const filteredMembers = members.filter(member => {
    if (!searchQuery) return true
    const user = member.user
    if (!user) return false
    
    return (
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const currentUserRole = members.find(m => m.user_id === currentUser?.id)?.role
  const isAdmin = currentUserRole === 'admin'

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
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your team members and invitations
          </p>
        </div>
        
        {isAdmin && (
          <Button onClick={() => setShowInviteDialog(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Invite Members
          </Button>
        )}
      </div>

      {/* Organization Selector */}
      {organizations.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog - Available for all orgs */}
      {selectedOrgId && (
        <InviteDialog
          isOpen={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          organizationId={selectedOrgId}
          organizationName={organizations.find(o => o.id === selectedOrgId)?.name || ''}
          onInviteSent={() => {
            cache.invalidate(CACHE_KEYS.INVITATIONS(selectedOrgId))
            loadInvitations()
            setShowInviteDialog(false)
          }}
        />
      )}

      {/* Show StrideShift team section if that org is selected */}
      {organizations.find(o => o.id === selectedOrgId)?.name === 'StrideShift' ? (
        <StrideshiftTeamSection
          organizationId={selectedOrgId}
          searchQuery={searchQuery}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onRoleChange={handleRoleChange}
          onRemoveMember={handleRemoveMember}
        />
      ) : (
      <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => m.role === 'admin').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitations.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* This would need real-time presence data */}
              {members.filter(m => m.user_id === currentUser?.id).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Team Members</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Joined</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const user = member.user
                if (!user) return null
                
                const initials = user.full_name
                  ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                  : user.email.charAt(0).toUpperCase()
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user.full_name || user.email}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAdmin && member.user_id !== currentUser?.id ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleRoleChange(member.id, value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.department || '-'}
                    </TableCell>
                    <TableCell>
                      {formatRelativeTime(member.joined_at)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {member.user_id !== currentUser?.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No members found matching your search' : 'No team members yet'}
            </div>
          )}
        </CardContent>
      </Card>

      </>
      )}

      {/* Pending Invitations - Available for all orgs */}
      {isAdmin && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              These invitations are waiting to be accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{invite.email}</div>
                    <div className="text-sm text-muted-foreground">
                      Invited {formatRelativeTime(invite.created_at)}
                      {invite.expires_at && (
                        <span> • Expires {formatRelativeTime(invite.expires_at)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{invite.role}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResendInvite(invite.id)}
                    >
                      Resend
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancelInvite(invite.id)}
                    >
                      Cancel
                    </Button>
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