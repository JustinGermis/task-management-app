'use client'

import { useState, useEffect } from 'react'
import { Building, Users, Shield } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { OrganizationSettings } from './organization-settings'
import { TeamSettings } from './team-settings'
import { getOrganizations, getCurrentUserProfile, getOrganizationMembers } from '@/lib/api/simple-api'
import { useDataCache } from '@/lib/contexts/data-cache-context'

const CACHE_KEYS = {
  PROFILE: 'settings:profile',
  ORGANIZATIONS: 'settings:organizations',
}

export function SettingsContent() {
  const cache = useDataCache()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // Check cache first
    const cachedProfile = cache.get(CACHE_KEYS.PROFILE)
    const cachedOrgs = cache.get(CACHE_KEYS.ORGANIZATIONS)

    if (cachedProfile && !cache.isStale(CACHE_KEYS.PROFILE) &&
        cachedOrgs && !cache.isStale(CACHE_KEYS.ORGANIZATIONS)) {
      setCurrentUser(cachedProfile)
      setOrganizations(cachedOrgs)
      setIsSuperAdmin(cachedProfile.is_super_admin || false)
      if (cachedOrgs.length > 0) {
        await checkAdminRole(cachedOrgs[0].id, cachedProfile.id)
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
      setIsSuperAdmin(profile.is_super_admin || false)
      cache.set(CACHE_KEYS.PROFILE, profile)
      cache.set(CACHE_KEYS.ORGANIZATIONS, orgs)

      if (orgs.length > 0) {
        await checkAdminRole(orgs[0].id, profile.id)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkAdminRole = async (orgId: string, userId: string) => {
    try {
      const members = await getOrganizationMembers(orgId)
      const currentMember = members.find((m: any) => m.user_id === userId)
      setIsAdmin(currentMember?.role === 'admin')
    } catch (error) {
      console.error('Failed to check admin role:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your organization and team settings</p>
        </div>
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your organization and team settings</p>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="space-y-4">
          <OrganizationSettings
            organization={organizations[0]}
            isAdmin={isAdmin}
            onUpdate={loadData}
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <TeamSettings
            organizationId={organizations[0]?.id}
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
          />
        </TabsContent>
      </Tabs>

      {!isAdmin && (
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <p>Some settings require administrator privileges. Contact your organization admin to make changes.</p>
          </div>
        </Card>
      )}
    </div>
  )
}
