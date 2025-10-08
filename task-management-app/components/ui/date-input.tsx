'use client'

import { CalendarIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface DateInputProps {
  value?: string // yyyy-MM-dd format
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DateInput({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  className
}: DateInputProps) {
  return (
    <div className="relative">
      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn("pl-9 w-[180px]", className)}
      />
    </div>
  )
}
