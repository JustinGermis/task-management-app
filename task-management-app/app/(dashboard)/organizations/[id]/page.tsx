'use client'

import { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { useUser } from '@/lib/contexts/user-context'
import { OrganizationDetails } from '@/components/organizations/organization-details'
import { getOrganization } from '@/lib/api/organizations'

interface OrganizationPageProps {
  params: { id: string }
}

export default function OrganizationPage({ params }: OrganizationPageProps) {
  const user = useUser()
  const [organization, setOrganization] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadOrganization = async () => {
      try {
        const org = await getOrganization(params.id)
        if (!org) {
          notFound()
        }
        setOrganization(org)
      } catch (error) {
        notFound()
      } finally {
        setIsLoading(false)
      }
    }

    loadOrganization()
  }, [params.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!organization) {
    notFound()
  }

  return <OrganizationDetails organization={organization} currentUser={user} />
}