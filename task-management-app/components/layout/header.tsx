'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Bell, Search, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, formatRelativeTime } from '@/lib/utils'
import { getNotifications, getUnreadNotificationCount, markNotificationAsRead, getCurrentUserProfile } from '@/lib/api/simple-api'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'

interface HeaderProps {
  title?: string
  onMenuClick?: () => void
  showMenu?: boolean
  className?: string
}

export function Header({ title, onMenuClick, showMenu = true, className }: HeaderProps) {
  const [searchValue, setSearchValue] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSendingDigest, setIsSendingDigest] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadNotifications()
    checkAdminStatus()
    // Refresh notifications every minute
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const checkAdminStatus = async () => {
    try {
      const profile = await getCurrentUserProfile()
      setIsAdmin(profile?.is_super_admin || false)
    } catch (error) {
      console.error('Failed to check admin status:', error)
    }
  }

  const loadNotifications = async () => {
    try {
      const [notificationsData, countData] = await Promise.all([
        getNotifications(5), // Get last 5 notifications for dropdown
        getUnreadNotificationCount()
      ])
      setNotifications(notificationsData)
      setUnreadCount(countData)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id)
        setUnreadCount(prev => Math.max(0, prev - 1))
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ))
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return '📋'
      case 'task_completed':
        return '✅'
      case 'task_due':
        return '⏰'
      case 'project_updated':
        return '📁'
      case 'team_joined':
        return '👥'
      default:
        return '🔔'
    }
  }

  const handleSendDigestNow = async () => {
    setIsSendingDigest(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not found')
      }

      const response = await fetch(
        'https://aevvuzgavyuqlafflkqz.supabase.co/functions/v1/send-daily-digest',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            testMode: true,
            testUserId: user.id,
            time: new Date().toISOString()
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send digest')
      }

      // Show success message based on whether email was sent or not
      if (result.stats?.emailsSent > 0) {
        toast({
          title: "Test digest sent! ✅",
          description: `Email sent to your inbox immediately. Check for subject starting with [TEST].`,
        })
      } else {
        toast({
          title: "No digest to send",
          description: "You have no new tasks or upcoming deadlines in the last 24 hours.",
        })
      }
    } catch (error) {
      console.error('Failed to send digest:', error)
      toast({
        title: "Failed to send digest",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive"
      })
    } finally {
      setIsSendingDigest(false)
    }
  }

  return (
    <header className={cn('flex h-16 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6', className)}>
      <div className="flex items-center space-x-4 flex-1">
        {showMenu && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        {title && (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-64 pl-9 bg-muted/30 border-muted focus:bg-background transition-colors"
          />
        </div>

        {/* Admin: Send Daily Digest */}
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSendDigestNow}
            disabled={isSendingDigest}
            className="hidden md:flex items-center space-x-2"
            title="Send daily digest emails now (for testing)"
          >
            <Send className="h-4 w-4" />
            <span className="text-sm">
              {isSendingDigest ? 'Sending...' : 'Send Digest'}
            </span>
          </Button>
        )}

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-[10px] font-medium flex items-center justify-center"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="px-3 py-2 border-b">
              <h4 className="font-semibold">Notifications</h4>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {unreadCount} unread
                </p>
              )}
            </div>
            {isLoading ? (
              <div className="p-3">
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              <>
                {notifications.map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id}
                    className="p-3 cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3 w-full">
                      <div className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-sm truncate">{notification.title}</p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full shrink-0"></div>
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
                <div className="border-t p-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full"
                    onClick={() => router.push('/notifications')}
                  >
                    View all notifications
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}