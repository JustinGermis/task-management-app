'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signUp } from '@/lib/auth-client'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('invite')
  const autoLogout = searchParams.get('auto_logout')
  const emailParam = searchParams.get('email')

  useEffect(() => {
    const handleAutoLogout = async () => {
      // Check if we need to auto logout
      if (autoLogout === 'true') {
        const loggedOut = searchParams.get('logged_out')

        if (!loggedOut) {
          // First visit - logout and reload
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()

          await supabase.auth.signOut({ scope: 'global' })
          localStorage.clear()
          sessionStorage.clear()

          // Delete all cookies
          document.cookie.split(';').forEach((c) => {
            document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
          })

          // Rebuild URL without auto_logout but with logged_out flag
          const params = new URLSearchParams(searchParams.toString())
          params.delete('auto_logout')
          params.set('logged_out', 'true')

          window.location.href = `/auth/signup?${params.toString()}`
          return
        }
      }

      // Set email from parameter if present
      if (emailParam) {
        setEmail(emailParam)
      }

      // Check invitation after potential logout
      if (inviteCode) {
        checkInvitation()
      }
    }

    handleAutoLogout()
  }, [inviteCode, autoLogout, emailParam, searchParams])

  const checkInvitation = async () => {
    try {
      const { checkInvitation } = await import('@/lib/api/simple-api')
      const inviteData = await checkInvitation(inviteCode!)
      if (inviteData) {
        setInvitation(inviteData)
        setEmail(inviteData.email)
      }
    } catch (error) {
      console.error('Failed to check invitation:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    // If there's an invitation code, use the Edge Function for auto-confirmed signup
    if (inviteCode) {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invitation-signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              email,
              password,
              fullName,
              inviteCode
            })
          }
        )

        const result = await response.json()

        if (!response.ok || result.error) {
          setError(result.error || 'Failed to create account')
          setIsLoading(false)
          return
        }

        // Set the session
        if (result.session) {
          await supabase.auth.setSession({
            access_token: result.session.access_token,
            refresh_token: result.session.refresh_token
          })
        }

        // Redirect to dashboard immediately (no email verification needed)
        router.push('/dashboard')
      } catch (err: any) {
        console.error('Invitation signup error:', err)
        setError(err.message || 'Failed to create account')
        setIsLoading(false)
      }
    } else {
      // Regular signup (requires email verification)
      const { data, error } = await signUp(email, password, fullName, inviteCode || undefined)

      if (error) {
        setError(error.message)
        setIsLoading(false)
      } else {
        setSuccess(true)
        setIsLoading(false)
      }
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Check your email</CardTitle>
            <CardDescription className="text-center">
              We&apos;ve sent you a verification link at {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground text-center">
                {inviteCode ? (
                  <>
                    Click the link in your email to verify your account.
                    You&apos;ll then be redirected to accept your team invitation.
                  </>
                ) : (
                  'Click the link in your email to verify your account and start using the app.'
                )}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/auth/login')}
              >
                Back to Login
              </Button>
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
          <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
          <CardDescription className="text-center">
            {invitation ? (
              <span>Accept your invitation to {invitation.organization?.name}</span>
            ) : (
              'Enter your details to get started'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || !!invitation}
                readOnly={!!invitation}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Creating account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}