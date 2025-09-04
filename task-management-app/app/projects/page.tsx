import { getUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProjectsList } from '@/components/projects/projects-list'

export default async function ProjectsPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout user={user} title="Projects">
      <ProjectsList />
    </DashboardLayout>
  )
}