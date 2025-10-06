'use client'

import { useUser } from '@/lib/contexts/user-context'
import { ProfileForm } from '@/components/profile/profile-form'

export default function ProfilePage() {
  const user = useUser()

  return (
    <div className="max-w-2xl mx-auto">
      <ProfileForm user={user} />
    </div>
  )
}