import { getUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProjectListView } from '@/components/tasks/project-list-view'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout user={user} title="Project Tasks">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </Link>
        </div>
        
        <ProjectListView projectId={params.id} />
      </div>
    </DashboardLayout>
  )
}