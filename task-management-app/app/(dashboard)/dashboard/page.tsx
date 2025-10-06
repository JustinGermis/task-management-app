'use client'

import { useUser } from '@/lib/contexts/user-context'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default function DashboardPage() {
  const user = useUser()

  return <DashboardContent userName={user.full_name || 'User'} />
}