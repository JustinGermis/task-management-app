'use client'

import { useState, useEffect } from 'react'
import { Plus, Mail, Shield, UserX, Search } from 'lucide-react'
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
  getOrganizationMembers,
  removeMember,
} from '@/lib/api/simple-api'
import { InviteDialog } from '@/components/team/invite-dialog'
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
  }
}

interface TeamSettingsProps {
  organizationId?: string
  isAdmin: boolean
}

export function TeamSettings({ organizationId, isAdmin }: TeamSettingsProps) {
  const cache = useDataCache()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (organizationId) {
      loadMembers()
    }
  }, [organizationId])

  const loadMembers = async () => {
    if (!organizationId) return

    const cacheKey = `settings:members:${organizationId}`
    const cached = cache.get(cacheKey)

    if (cached && !cache.isStale(cacheKey)) {
      setMembers(cached)
      setIsLoading(false)
      return
    }

    try {
      const data = await getOrganizationMembers(organizationId)
      setMembers(data)
      cache.set(cacheKey, data)
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!isAdmin) {
      alert('Only administrators can remove team members')
      return
    }

    if (!confirm('Are you sure you want to remove this member from the organization?')) return

    try {
      await removeMember(organizationId!, memberId)
      setMembers(members.filter(m => m.id !== memberId))
      cache.invalidate(`settings:members:${organizationId}`)
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert('Failed to remove member. Please try again.')
    }
  }

  const filteredMembers = members.filter(member =>
    member.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      admin: 'default',
      manager: 'secondary',
      member: 'outline',
      guest: 'outline'
    }
    return variants[role] || 'outline'
  }

  if (!organizationId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            No organization found. You need to be a member of an organization to manage team members.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage your organization's team members</CardDescription>
          </div>
          <Button
            onClick={() => setShowInviteDialog(true)}
            disabled={!isAdmin}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Invite Member
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.user?.avatar_url || undefined} />
                            <AvatarFallback>
                              {member.user?.full_name?.charAt(0) || member.user?.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {member.user?.full_name || 'Unnamed User'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {member.user?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadge(member.role)}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id, member.user_id)}
                          disabled={!isAdmin || member.role === 'admin'}
                          className="text-destructive hover:text-destructive"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {!isAdmin && (
          <p className="text-sm text-muted-foreground">
            Only administrators can invite or remove team members.
          </p>
        )}
      </CardContent>

      <InviteDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        organizationId={organizationId}
        onInviteSent={() => {
          setShowInviteDialog(false)
          loadMembers()
        }}
      />
    </Card>
  )
}
