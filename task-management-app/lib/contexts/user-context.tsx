'use client'

import { createContext, useContext } from 'react'
import { AuthUser } from '@/lib/types'

const UserContext = createContext<AuthUser | null>(null)

export function UserProvider({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}
