import { createClient } from '@/lib/supabase/client'
import { OrganizationWithDetails, CreateOrganizationData, UserRole } from '@/lib/types'

export async function getOrganizations(): Promise<any[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  try {
    // First get organizations where user is a member
    const { data: memberOrgs, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)

    if (memberError) {
      console.error('Error fetching member organizations:', memberError)
      return []
    }

    const orgIds = memberOrgs?.map(m => m.organization_id) || []

    if (orgIds.length === 0) return []

    // Get organizations with member counts
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select(`
        *,
        members:organization_members(
          id,
          role,
          joined_at,
          user_id
        )
      `)
      .in('id', orgIds)
      .order('created_at', { ascending: false })

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError)
      return []
    }

    return orgs || []
  } catch (error) {
    console.error('Failed to load organizations:', error)
    return []
  }
}

export async function createOrganization(data: CreateOrganizationData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  try {
    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: data.name,
        description: data.description,
        created_by: user.id,
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      throw orgError
    }

    // Add creator as admin member - in a separate try/catch to ensure org is created
    try {
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          role: 'admin' as UserRole,
        })

      if (memberError) {
        console.error('Error adding member:', memberError)
        // Don't throw here - organization was created successfully
      }
    } catch (memberErr) {
      console.error('Failed to add initial member:', memberErr)
    }

    return organization
  } catch (error) {
    console.error('Failed to create organization:', error)
    throw error
  }
}