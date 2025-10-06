import { getUser } from '@/lib/auth-server'
import { notFound } from 'next/navigation'
import { OrganizationDetails } from '@/components/organizations/organization-details'
import { getOrganization } from '@/lib/api/organizations'

interface OrganizationPageProps {
  params: Promise<{ id: string }>
}

export default async function OrganizationPage({ params }: OrganizationPageProps) {
  const user = await getUser()
  const { id } = await params

  try {
    const organization = await getOrganization(id)

    if (!organization) {
      notFound()
    }

    return <OrganizationDetails organization={organization} currentUser={user!} />
  } catch (error) {
    notFound()
  }
}