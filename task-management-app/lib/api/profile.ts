import { createClient } from '@/lib/supabase/client'
import { UpdateProfileData } from '@/lib/types'

export async function updateProfile(data: UpdateProfileData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      full_name: data.full_name,
      bio: data.bio,
      department: data.department,
      phone: data.phone,
      timezone: data.timezone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return profile
}

export async function uploadAvatar(file: File) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}.${fileExt}`

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true })

  if (uploadError) throw uploadError

  // Get public URL
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  // Update profile with new avatar URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: data.publicUrl })
    .eq('id', user.id)

  if (updateError) throw updateError

  return data.publicUrl
}