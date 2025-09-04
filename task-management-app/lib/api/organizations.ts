import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { OrganizationWithDetails, CreateOrganizationData, UserRole } from '@/lib/types'

export async function getOrganizations(): Promise<OrganizationWithDetails[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  // First get organizations where user is a member
  const { data: memberOrgs, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)

  if (memberError) throw memberError

  const orgIds = memberOrgs?.map(m => m.organization_id) || []

  if (orgIds.length === 0) return []

  // Then get the full organization details
  const { data, error } = await supabase
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

  if (error) throw error

  // Fetch profiles separately for members
  const organizations = data || []
  for (const org of organizations) {
    for (const member of org.members) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', member.user_id)
        .single()
      
      member.user = profile
    }
  }

  return organizations
}

export async function getOrganization(id: string): Promise<OrganizationWithDetails | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('organizations')
    .select(`
      *,
      members:organization_members(
        id,
        role,
        joined_at,
        user_id
      ),
      projects(
        id,
        name,
        status,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  
  // Fetch profiles for members
  if (data?.members) {
    for (const member of data.members) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', member.user_id)
        .single()
      
      member.user = profile
    }
  }
  
  return data
}

export async function createOrganization(data: CreateOrganizationData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

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

  if (orgError) throw orgError

  // Add creator as admin member
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organization.id,
      user_id: user.id,
      role: 'admin' as UserRole,
    })

  if (memberError) throw memberError

  return organization
}

export async function updateOrganization(id: string, data: Partial<CreateOrganizationData>) {
  const supabase = createClient()
  
  const { data: organization, error } = await supabase
    .from('organizations')
    .update({
      name: data.name,
      description: data.description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return organization
}

export async function deleteOrganization(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function inviteMember(organizationId: string, email: string, role: UserRole = 'member') {
  // In a real app, you'd send an email invitation
  // For now, we'll just add them if they exist
  const supabase = createClient()
  
  // Check if user exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (profileError) throw new Error('User not found')

  // Add to organization
  const { error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: profile.id,
      role,
    })

  if (error) throw error
}

export async function removeMember(organizationId: string, userId: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function updateMemberRole(organizationId: string, userId: string, role: UserRole) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('organization_id', organizationId)
    .eq('user_id', userId)

  if (error) throw error
}