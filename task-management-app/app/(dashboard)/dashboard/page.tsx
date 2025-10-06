import { getUser } from '@/lib/auth-server'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const user = await getUser()

  return <DashboardContent userName={user?.full_name || 'User'} />
}