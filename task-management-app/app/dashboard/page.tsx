import { getUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout user={user} title="Dashboard">
      <DashboardContent userName={user.full_name || 'User'} />
    </DashboardLayout>
  )
}