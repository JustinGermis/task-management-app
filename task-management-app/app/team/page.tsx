import { getUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { TeamManagement } from '@/components/team/team-management'

export default async function TeamPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout user={user} title="Team">
      <TeamManagement />
    </DashboardLayout>
  )
}