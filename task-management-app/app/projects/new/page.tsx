import { getUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { CreateProjectForm } from '@/components/projects/create-project-form'

export default async function NewProjectPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout user={user} title="Create Project">
      <div className="max-w-2xl mx-auto">
        <CreateProjectForm />
      </div>
    </DashboardLayout>
  )
}