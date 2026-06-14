'use client'

import { useId, useState } from 'react'

const sizeClasses = {
  sm: {
    track: 'w-9 h-5',
    thumb: 'size-4',
    translate: 'peer-checked:translate-x-4',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'size-5',
    translate: 'peer-checked:translate-x-full',
  },
  lg: {
    track: 'w-14 h-7',
    thumb: 'size-6',
    translate: 'peer-checked:translate-x-7',
  },
} as const

export interface SwitcherProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange'> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  size?: keyof typeof sizeClasses
  wrapperClassName?: string
}

/** Interrupteur Preline (remplace les checkboxes booléennes). */
export function Switcher({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  id: idProp,
  name,
  value,
  size = 'md',
  className = '',
  wrapperClassName = '',
  ...props
}: SwitcherProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const isControlled = checked !== undefined
  const [internal, setInternal] = useState(defaultChecked ?? false)
  const isOn = isControlled ? checked : internal
  const s = sizeClasses[size]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked
    if (!isControlled) setInternal(next)
    onCheckedChange?.(next)
  }

  return (
    <label
      htmlFor={id}
      className={`relative inline-block shrink-0 cursor-pointer ${s.track} ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      } ${wrapperClassName}`}
    >
      <input
        {...props}
        id={id}
        type="checkbox"
        role="switch"
        name={name}
        value={value}
        checked={isOn}
        onChange={handleChange}
        disabled={disabled}
        className="peer sr-only"
        aria-checked={isOn}
      />
      <span className="absolute inset-0 bg-gray-200 rounded-full transition-colors duration-200 ease-in-out peer-checked:bg-primary peer-disabled:opacity-50 dark:bg-neutral-700 dark:peer-checked:bg-primary" />
      <span
        className={`absolute top-1/2 start-0.5 -translate-y-1/2 ${s.thumb} bg-white rounded-full shadow-xs transition-transform duration-200 ease-in-out ${s.translate} dark:bg-neutral-400 dark:peer-checked:bg-white ${className}`}
      />
    </label>
  )
}

export interface SwitcherFieldProps extends Omit<SwitcherProps, 'id'> {
  label: string
  description?: string
  id?: string
  /** Label à gauche (défaut) ou à droite du switch. */
  labelPosition?: 'start' | 'end'
}

/** Ligne label + switch (pattern Preline « switch with description »). */
export function SwitcherField({
  label,
  description,
  labelPosition = 'start',
  id,
  className = '',
  ...switcherProps
}: SwitcherFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId

  const text = (
    <div className={labelPosition === 'end' ? 'text-end' : ''}>
      <label htmlFor={fieldId} className="text-sm font-medium text-gray-800 dark:text-neutral-200 cursor-pointer">
        {label}
      </label>
      {description ? (
        <p className="text-xs text-gray-500 dark:text-neutral-500 mt-0.5">{description}</p>
      ) : null}
    </div>
  )

  return (
    <div className={`flex items-center justify-between gap-x-3 ${className}`}>
      {labelPosition === 'start' ? (
        <>
          {text}
          <Switcher id={fieldId} {...switcherProps} />
        </>
      ) : (
        <>
          <Switcher id={fieldId} {...switcherProps} />
          {text}
        </>
      )}
    </div>
  )
}

export type SwitcherGroupOption = {
  id: string
  label: string
  description?: string
}

export interface SwitcherGroupProps {
  options: SwitcherGroupOption[]
  value: Record<string, boolean>
  onChange: (id: string, checked: boolean) => void
  disabled?: boolean
  className?: string
}

/** Liste de permissions / options booléennes (remplace une liste de checkboxes). */
export function SwitcherGroup({ options, value, onChange, disabled, className = '' }: SwitcherGroupProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {options.map((opt) => (
        <SwitcherField
          key={opt.id}
          id={`switch-${opt.id}`}
          label={opt.label}
          description={opt.description}
          checked={Boolean(value[opt.id])}
          onCheckedChange={(checked) => onChange(opt.id, checked)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

/** @deprecated Utiliser Switcher ou SwitcherField */
export const Checkbox = SwitcherField
