'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Loader2, UserPlus, LogIn } from 'lucide-react'
import { checkInvitation, acceptInvitation } from '@/lib/api/simple-api'
import { createClient } from '@/lib/supabase/client'

function InvitePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('code')
  
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!inviteCode) {
      setError('No invitation code provided')
      setIsLoading(false)
      return
    }
    
    checkInvitationStatus()
  }, [inviteCode])

  const checkInvitationStatus = async () => {
    try {
      // Check invitation validity first
      const inviteData = await checkInvitation(inviteCode!)

      if (!inviteData) {
        setError('Invalid or expired invitation')
        setIsLoading(false)
        return
      }

      setInvitation(inviteData)

      // Check if user is logged in
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // If user is logged in, sign them out and redirect to signup
      if (user) {
        await supabase.auth.signOut()
        // Force full page reload to clear session completely
        window.location.href = `/auth/signup?invite=${inviteCode}&email=${encodeURIComponent(inviteData.email)}`
        return
      }

      setCurrentUser(null)
    } catch (error) {
      console.error('Failed to check invitation:', error)
      setError('Failed to verify invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!inviteCode) return
    
    setIsAccepting(true)
    setError('')

    try {
      await acceptInvitation(inviteCode)
      setSuccess(true)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Failed to accept invitation:', error)
      setError(error.message || 'Failed to accept invitation')
      setIsAccepting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Verifying invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex flex-col space-y-2">
              <Button asChild>
                <Link href="/auth/login">Go to Login</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <CardTitle>Invitation Accepted!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You've successfully joined {invitation?.organization?.name}. 
              Redirecting to your dashboard...
            </p>
            <div className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Team Invitation</CardTitle>
          <CardDescription>
            You've been invited to join a team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {invitation && (
            <>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Organization</p>
                    <p className="font-medium">{invitation.organization?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Role</p>
                    <Badge className="mt-1">{invitation.role}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Invited Email</p>
                    <p className="font-medium">{invitation.email}</p>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Create an account or sign in with <strong>{invitation.email}</strong> to accept this invitation.
                  </p>
                  <div className="space-y-2">
                    <Button className="w-full" asChild>
                      <Link href={`/auth/signup?invite=${inviteCode}&email=${encodeURIComponent(invitation.email)}`}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create Account
                      </Link>
                    </Button>
                    <Button className="w-full" variant="outline" asChild>
                      <Link href={`/auth/login?invite=${inviteCode}&email=${encodeURIComponent(invitation.email)}`}>
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  )
}