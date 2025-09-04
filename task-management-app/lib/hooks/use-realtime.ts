'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeOptions {
  table: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

export function useRealtime(options: RealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const { table, filter, onInsert, onUpdate, onDelete } = options

    // Create channel name
    const channelName = `${table}${filter ? `_${filter}` : ''}`
    
    // Create the channel
    const channel = supabase.channel(channelName)

    // Set up table listeners
    if (onInsert) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          filter,
        },
        onInsert
      )
    }

    if (onUpdate) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table,
          filter,
        },
        onUpdate
      )
    }

    if (onDelete) {
      channel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table,
          filter,
        },
        onDelete
      )
    }

    // Subscribe to the channel
    channel.subscribe()
    channelRef.current = channel

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [options.table, options.filter])

  // Function to unsubscribe manually
  const unsubscribe = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }

  return { unsubscribe }
}

// Hook for task updates
export function useTaskUpdates(
  projectId: string | null,
  onTaskChange: (type: 'INSERT' | 'UPDATE' | 'DELETE', task: any) => void
) {
  return useRealtime({
    table: 'tasks',
    filter: projectId ? `project_id=eq.${projectId}` : undefined,
    onInsert: (payload) => onTaskChange('INSERT', payload.new),
    onUpdate: (payload) => onTaskChange('UPDATE', payload.new),
    onDelete: (payload) => onTaskChange('DELETE', payload.old),
  })
}

// Hook for comment updates
export function useCommentUpdates(
  taskId: string,
  onCommentChange: (type: 'INSERT' | 'UPDATE' | 'DELETE', comment: any) => void
) {
  return useRealtime({
    table: 'comments',
    filter: `task_id=eq.${taskId}`,
    onInsert: (payload) => onCommentChange('INSERT', payload.new),
    onUpdate: (payload) => onCommentChange('UPDATE', payload.new),
    onDelete: (payload) => onCommentChange('DELETE', payload.old),
  })
}

// Hook for project member updates
export function useProjectMemberUpdates(
  projectId: string,
  onMemberChange: (type: 'INSERT' | 'UPDATE' | 'DELETE', member: any) => void
) {
  return useRealtime({
    table: 'project_members',
    filter: `project_id=eq.${projectId}`,
    onInsert: (payload) => onMemberChange('INSERT', payload.new),
    onUpdate: (payload) => onMemberChange('UPDATE', payload.new),
    onDelete: (payload) => onMemberChange('DELETE', payload.old),
  })
}

// Hook for organization member updates
export function useOrganizationMemberUpdates(
  organizationId: string,
  onMemberChange: (type: 'INSERT' | 'UPDATE' | 'DELETE', member: any) => void
) {
  return useRealtime({
    table: 'organization_members',
    filter: `organization_id=eq.${organizationId}`,
    onInsert: (payload) => onMemberChange('INSERT', payload.new),
    onUpdate: (payload) => onMemberChange('UPDATE', payload.new),
    onDelete: (payload) => onMemberChange('DELETE', payload.old),
  })
}