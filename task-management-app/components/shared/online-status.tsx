'use client'

import { Wifi, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import { Badge } from '@/components/ui/badge'

export function OnlineStatus() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Badge variant="destructive" className="animate-pulse">
        <WifiOff className="mr-1 h-3 w-3" />
        Offline
      </Badge>
    </div>
  )
}