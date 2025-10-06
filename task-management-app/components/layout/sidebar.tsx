'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  CheckSquare,
  User,
  Settings,
  LogOut,
  Building,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/lib/auth-client'
import { AuthUser } from '@/lib/types'

interface SidebarProps {
  user: AuthUser
  className?: string
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Organizations',
    href: '/organizations',
    icon: Building,
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderOpen,
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: CheckSquare,
  },
  {
    name: 'Team',
    href: '/team',
    icon: Users,
  },
]

export function Sidebar({ user, className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const userInitials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email.charAt(0).toUpperCase()

  return (
    <div className={cn('flex h-full w-64 flex-col bg-card border-r', className)}>
      {/* Header */}
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <div className="relative">
              <CheckSquare className="h-4 w-4 text-primary-foreground" />
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-emerald-400 rounded-full"></div>
            </div>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">TaskFlow</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = isPending
            ? pendingHref === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={(e) => {
                if (pathname !== item.href) {
                  setPendingHref(item.href)
                  startTransition(() => {
                    router.push(item.href)
                  })
                }
              }}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
        
        {/* Quick Actions */}
        <div className="pt-4 mt-4 border-t">
          <div className="px-3 mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Actions
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start flex items-center"
            asChild
          >
            <Link href="/organizations/new" className="flex items-center">
              <Plus className="h-4 w-4 mr-2 shrink-0" />
              <span>New Organization</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start flex items-center"
            asChild
          >
            <Link href="/projects/new" className="flex items-center">
              <Plus className="h-4 w-4 mr-2 shrink-0" />
              <span>New Project</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start flex items-center"
            asChild
          >
            <Link href="/tasks/new" className="flex items-center">
              <Plus className="h-4 w-4 mr-2 shrink-0" />
              <span>New Task</span>
            </Link>
          </Button>
        </div>
      </nav>

      {/* User Profile */}
      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start h-auto p-2">
              <Avatar className="h-8 w-8 mr-3">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium truncate">
                  {user.full_name || 'User'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user.email}
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}