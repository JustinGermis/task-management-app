import { getUser } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { OrganizationDetails } from '@/components/organizations/organization-details'
import { getOrganization } from '@/lib/api/organizations'

interface OrganizationPageProps {
  params: Promise<{ id: string }>
}

export default async function OrganizationPage({ params }: OrganizationPageProps) {
  const user = await getUser()
  const { id } = await params
  
  if (!user) {
    redirect('/auth/login')
  }

  try {
    const organization = await getOrganization(id)
    
    if (!organization) {
      notFound()
    }

    return (
      <DashboardLayout user={user} title={organization.name}>
        <OrganizationDetails organization={organization} currentUser={user} />
      </DashboardLayout>
    )
  } catch (error) {
    notFound()
  }
}