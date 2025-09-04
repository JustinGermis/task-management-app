import { getUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { CreateOrganizationForm } from '@/components/organizations/create-organization-form'

export default async function NewOrganizationPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout user={user} title="Create Organization">
      <div className="max-w-2xl mx-auto">
        <CreateOrganizationForm />
      </div>
    </DashboardLayout>
  )
}