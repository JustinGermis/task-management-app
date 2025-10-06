import { getUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AITaskProcessorPanel } from '@/components/ai/ai-task-processor-panel'

export default async function AIProcessorPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout user={user} title="AI Task Processor">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI-Powered Task Management</h1>
          <p className="text-gray-600 mt-2">
            Automatically extract and assign tasks from emails and documents using AI
          </p>
        </div>
        
        <AITaskProcessorPanel />
      </div>
    </DashboardLayout>
  )
}