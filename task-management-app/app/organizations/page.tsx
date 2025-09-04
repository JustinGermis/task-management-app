import { getUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { OrganizationsList } from '@/components/organizations/organizations-list'

export default async function OrganizationsPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout user={user} title="Organizations">
      <OrganizationsList />
    </DashboardLayout>
  )
}