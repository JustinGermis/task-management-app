import { getUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProfileForm } from '@/components/profile/profile-form'

export default async function ProfilePage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout user={user} title="Profile">
      <div className="max-w-2xl mx-auto">
        <ProfileForm user={user} />
      </div>
    </DashboardLayout>
  )
}