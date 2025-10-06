import { getUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { StrideshiftTeamDisplay } from '@/components/strideshift/team-display'
import { TeamAllocationPanel } from '@/components/team/team-allocation-panel'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function StrideshiftPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component cannot set cookies
          }
        },
      },
    }
  )
  
  // Get StrideShift organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('name', 'StrideShift')
    .single()

  return (
    <DashboardLayout user={user} title="Strideshift Team">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Strideshift Team Management</h1>
          <p className="text-gray-600 mt-2">
            View and manage your team members, test task allocation, and monitor workload
          </p>
        </div>

        {/* Main Team Display Component */}
        <StrideshiftTeamDisplay />

        {/* Allocation Testing Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Test Task Allocation</CardTitle>
            <CardDescription>
              Try different skill combinations to see how tasks would be assigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamAllocationPanel
              organizationId={org?.id || ''}
              taskTitle="Example: Build new feature"
              requiredSkills={['typescript', 'react', 'nodejs']}
              estimatedHours={8}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}