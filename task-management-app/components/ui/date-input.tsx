'use client'

import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

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
  const displayValue = value ? format(new Date(value), 'PPP') : placeholder

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-[180px] justify-start text-left font-normal",
          !value && "text-muted-foreground",
          className
        )}
        disabled={disabled}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        <span>{displayValue}</span>
      </Button>
      <Input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </div>
  )
}
