'use client'

import type { SelectOption } from '@/components/ui/select-search-types'
import {
  buildHsSelectConfig,
  destroyPrelineSelect,
  initPrelineSelect,
} from '@/lib/preline-select-config'
import { useCallback, useEffect, useId, useMemo, useRef } from 'react'

export type { SelectOption } from '@/components/ui/select-search-types'

export interface SelectSearchProps {
  options: SelectOption[]
  value?: SelectOption | null
  onChange?: (option: SelectOption | null) => void
  error?: boolean
  placeholder?: string
  isLoading?: boolean
  isDisabled?: boolean
  isClearable?: boolean
  required?: boolean
  instanceId?: string
  className?: string
}

export const selectSearchMenuStyles = {
  searchWrapper:
    'bg-white p-2 sticky top-0 dark:bg-neutral-900 dark:bg-neutral-900 z-10 border-b border-gray-100 dark:border-neutral-800',
  searchInput:
    'block w-full text-sm border border-gray-200 rounded-lg focus:border-primary focus:ring-primary dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200 dark:placeholder-neutral-500 py-2 px-3',
}

export function SelectSearch({
  options,
  value = null,
  onChange,
  error,
  placeholder = 'Sélectionnez...',
  isLoading,
  isDisabled,
  isClearable = false,
  required,
  instanceId,
  className = '',
}: SelectSearchProps) {
  const fallbackId = useId().replace(/:/g, '')
  const selectId = instanceId ?? fallbackId
  const selectRef = useRef<HTMLSelectElement>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const selectedValue = value?.value ?? ''

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextValue = e.currentTarget.value
      if (!nextValue) {
        onChange?.(null)
        return
      }
      const option = optionsRef.current.find((o) => o.value === nextValue) ?? null
      onChange?.(option)
    },
    [onChange],
  )
  const hasEmptyOption = isClearable || !required || options.some((o) => o.value === '')
  const disabled = Boolean(isDisabled || isLoading)

  const hsConfig = useMemo(
    () =>
      buildHsSelectConfig({
        placeholder,
        hasSearch: true,
        searchPlaceholder: 'Rechercher...',
        optionAllowEmptyOption: hasEmptyOption,
        error,
      }),
    [placeholder, hasEmptyOption, error],
  )

  useEffect(() => {
    const el = selectRef.current
    if (!el) return
    if (el.value !== selectedValue) el.value = selectedValue
  }, [selectedValue])

  useEffect(() => {
    const el = selectRef.current
    if (!el) return

    void initPrelineSelect(el)

    return () => {
      void destroyPrelineSelect(el)
    }
  }, [options, hsConfig, disabled, selectedValue])

  return (
    <div className={`relative w-full min-w-0 overflow-visible ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      <select
        ref={selectRef}
        id={selectId}
        data-hs-select={hsConfig}
        className="hidden"
        disabled={disabled}
        required={required}
        value={selectedValue}
        onChange={handleSelectChange}
      >
        {!hasEmptyOption ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value || '__empty'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
