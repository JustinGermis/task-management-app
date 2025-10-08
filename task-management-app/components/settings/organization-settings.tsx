'use client'

import { useState } from 'react'
import { Building, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateOrganization } from '@/lib/api/organizations'
import { useDataCache } from '@/lib/contexts/data-cache-context'

interface OrganizationSettingsProps {
  organization: any
  isAdmin: boolean
  onUpdate: () => void
}

export function OrganizationSettings({ organization, isAdmin, onUpdate }: OrganizationSettingsProps) {
  const cache = useDataCache()
  const [name, setName] = useState(organization?.name || '')
  const [description, setDescription] = useState(organization?.description || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!isAdmin) {
      setError('You must be an administrator to edit organization settings')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      await updateOrganization(organization.id, { name, description })
      cache.invalidate('settings:organizations')
      cache.invalidate('organizations:list')
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organization')
    } finally {
      setIsSaving(false)
    }
  }

  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Organization
          </CardTitle>
          <CardDescription>
            No organization found. You need to be a member of an organization.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Organization
        </CardTitle>
        <CardDescription>
          Manage your organization's basic information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Organization Name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin || isSaving}
            placeholder="Enter organization name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-description">Description</Label>
          <Textarea
            id="org-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isAdmin || isSaving}
            placeholder="Describe your organization"
            rows={4}
          />
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSave}
            disabled={!isAdmin || isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {!isAdmin && (
          <p className="text-sm text-muted-foreground">
            Only administrators can edit organization settings.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
