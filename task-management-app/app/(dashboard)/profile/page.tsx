import { getUser } from '@/lib/auth-server'
import { ProfileForm } from '@/components/profile/profile-form'

export default async function ProfilePage() {
  const user = await getUser()

  return (
    <div className="max-w-2xl mx-auto">
      <ProfileForm user={user!} />
    </div>
  )
}