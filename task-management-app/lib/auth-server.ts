import { createClient } from '@/lib/supabase/server'
import { AuthUser } from '@/lib/types'

export async function getUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    ...profile,
    id: user.id,
    email: user.email!,
  }
}