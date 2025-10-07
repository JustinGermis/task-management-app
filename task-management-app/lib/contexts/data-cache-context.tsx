'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

interface DataCacheContextType {
  get: <T>(key: string) => T | null
  set: <T>(key: string, data: T) => void
  invalidate: (key: string) => void
  invalidateAll: () => void
  isStale: (key: string, maxAge?: number) => boolean
}

const DataCacheContext = createContext<DataCacheContextType | null>(null)

const DEFAULT_MAX_AGE = 300000 // 5 minutes

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Map<string, CacheEntry<any>>>(new Map())

  const get = useCallback(<T,>(key: string): T | null => {
    const entry = cache.get(key)
    return entry ? entry.data : null
  }, [cache])

  const set = useCallback(<T,>(key: string, data: T) => {
    setCache(prev => {
      const newCache = new Map(prev)
      newCache.set(key, { data, timestamp: Date.now() })

      // Dispatch custom event to notify all components that cache has updated
      console.log('[Cache] Updated:', key, 'dispatching event')
      window.dispatchEvent(new CustomEvent('cache-updated', { detail: { key } }))

      return newCache
    })
  }, [])

  const invalidate = useCallback((key: string) => {
    setCache(prev => {
      const newCache = new Map(prev)
      newCache.delete(key)
      return newCache
    })
  }, [])

  const invalidateAll = useCallback(() => {
    setCache(new Map())
  }, [])

  const isStale = useCallback((key: string, maxAge: number = DEFAULT_MAX_AGE): boolean => {
    const entry = cache.get(key)
    if (!entry) return true
    return Date.now() - entry.timestamp > maxAge
  }, [cache])

  return (
    <DataCacheContext.Provider value={{ get, set, invalidate, invalidateAll, isStale }}>
      {children}
    </DataCacheContext.Provider>
  )
}

export function useDataCache() {
  const context = useContext(DataCacheContext)
  if (!context) {
    throw new Error('useDataCache must be used within DataCacheProvider')
  }
  return context
}
