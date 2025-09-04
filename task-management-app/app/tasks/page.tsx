import { getUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { TasksPageContent } from '@/components/tasks/tasks-page-content'

export default async function TasksPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout user={user} title="Tasks">
      <TasksPageContent />
    </DashboardLayout>
  )
}