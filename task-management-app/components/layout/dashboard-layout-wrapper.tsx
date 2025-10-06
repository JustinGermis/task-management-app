'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from './dashboard-layout'
import { UserProvider } from '@/lib/contexts/user-context'
import { AuthUser } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

export function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()

      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/auth/login')
        return
      }

      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        setUser({
          ...profile,
          id: authUser.id,
          email: authUser.email!,
        })
      }

      setIsLoading(false)
    }

    loadUser()
  }, [router])

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <UserProvider user={user}>
      <DashboardLayout user={user}>{children}</DashboardLayout>
    </UserProvider>
  )
}
