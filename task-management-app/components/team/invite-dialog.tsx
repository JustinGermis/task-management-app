'use client'

import { useState } from 'react'
import { Mail, Users, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createInvitation } from '@/lib/api/simple-api'

interface InviteDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  organizationName: string
  onInviteSent: () => void
}

export function InviteDialog({
  isOpen,
  onOpenChange,
  organizationId,
  organizationName,
  onInviteSent,
}: InviteDialogProps) {
  const [emails, setEmails] = useState('')
  const [role, setRole] = useState<'admin' | 'manager' | 'member' | 'guest'>('member')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteLinks, setInviteLinks] = useState<Array<{ email: string; code: string }>>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setInviteLinks([])

    try {
      // Parse emails (comma or newline separated)
      const emailList = emails
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email.length > 0)
        .filter((email, index, self) => self.indexOf(email) === index) // Remove duplicates

      if (emailList.length === 0) {
        setError('Please enter at least one email address')
        setIsLoading(false)
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = emailList.filter(email => !emailRegex.test(email))
      if (invalidEmails.length > 0) {
        setError(`Invalid email format: ${invalidEmails.join(', ')}`)
        setIsLoading(false)
        return
      }

      // Send invitations
      const results = await Promise.allSettled(
        emailList.map(email =>
          createInvitation({
            email,
            organization_id: organizationId,
            role,
          })
        )
      )

      const successful: Array<{ email: string; code: string }> = []
      const failed: string[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          successful.push({
            email: emailList[index],
            code: result.value.invite_code,
          })
        } else {
          failed.push(emailList[index])
        }
      })

      if (successful.length > 0) {
        setInviteLinks(successful)
        onInviteSent()
      }

      if (failed.length > 0) {
        setError(`Failed to send invitations to: ${failed.join(', ')}`)
      }
    } catch (error) {
      console.error('Failed to send invitations:', error)
      setError(error instanceof Error ? error.message : 'Failed to send invitations')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleClose = () => {
    setEmails('')
    setRole('member')
    setError('')
    setInviteLinks([])
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
          <DialogDescription>
            Send invitations to join {organizationName}
          </DialogDescription>
        </DialogHeader>

        {inviteLinks.length === 0 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emails">Email Addresses</Label>
              <Textarea
                id="emails"
                placeholder="Enter email addresses (comma or newline separated)&#10;e.g., john@example.com, jane@example.com"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                rows={4}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Default Role</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access</SelectItem>
                  <SelectItem value="manager">Manager - Manage projects and tasks</SelectItem>
                  <SelectItem value="member">Member - Create and edit tasks</SelectItem>
                  <SelectItem value="guest">Guest - View only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitations
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Invitation Links</Label>
              <p className="text-sm text-muted-foreground">
                Share these links with your team members to join the organization.
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {inviteLinks.map((link, index) => {
                const inviteUrl = `${window.location.origin}/auth/invite?code=${link.code}`
                return (
                  <div key={index} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{link.email}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(inviteUrl, index)}
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Link
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground break-all">
                      {inviteUrl}
                    </div>
                  </div>
                )
              })}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}