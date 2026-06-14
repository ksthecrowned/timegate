'use client'

import { DatePicker, type DatePickerProps } from '@/components/ui/DatePicker'
import { parseApiDate, toIsoDate } from '@/lib/date-utils'

type DateFieldProps = Omit<DatePickerProps, 'value' | 'onChange'> & {
  value?: string | null
  onChange?: (value: string) => void
  required?: boolean
}

export function DateField({ value, onChange, required, id, ...props }: DateFieldProps) {
  return (
    <div className="relative">
      <DatePicker
        {...props}
        id={id}
        value={parseApiDate(value) ?? null}
        onChange={(date) => onChange?.(date ? toIsoDate(date) : '')}
      />
      {required && (
        <input
          tabIndex={-1}
          required
          value={value ?? ''}
          onChange={() => {}}
          className="absolute opacity-0 pointer-events-none h-0 w-0"
          aria-hidden
        />
      )}
    </div>
  )
}
