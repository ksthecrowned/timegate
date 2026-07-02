'use client'

import ReactSelect, { type Props as ReactSelectProps, type StylesConfig } from 'react-select'

import { SelectSearch, type SelectSearchProps } from '@/components/ui/SelectSearch'

import { HintTooltip } from '@/components/ui/HintTooltip'

import type { SelectOption } from '@/components/ui/select-search-types'



export type { SelectOption } from '@/components/ui/select-search-types'

export { SelectSearch }

export type { SelectSearchProps }



function buildMultiSelectStyles(error?: boolean): StylesConfig<SelectOption, true> {

  return {

    control: (base, state) => ({

      ...base,

      minHeight: '46px',

      borderRadius: '0.5rem',

      borderColor: error ? '#f87171' : state.isFocused ? 'var(--color-primary, #f97316)' : '#e5e7eb',

      boxShadow: state.isFocused

        ? `0 0 0 2px ${error ? '#f87171' : 'var(--color-primary, #f97316)33'}`

        : 'none',

      backgroundColor: 'white',

      fontSize: '0.875rem',

      paddingLeft: '0.25rem',

      '&:hover': {

        borderColor: error ? '#f87171' : 'var(--color-primary, #f97316)',

      },

    }),

    menu: (base) => ({

      ...base,

      borderRadius: '0.5rem',

      border: '1px solid #e5e7eb',

      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',

      zIndex: 60,

    }),

    option: (base, state) => ({

      ...base,

      fontSize: '0.875rem',

      backgroundColor: state.isFocused ? '#f3f4f6' : 'white',

      color: '#374151',

      cursor: 'pointer',

      borderRadius: '0.5rem',

    }),

    multiValue: (base) => ({

      ...base,

      backgroundColor: '#fff7ed',

      borderRadius: '9999px',

      border: '1px solid #fed7aa',

    }),

    multiValueLabel: (base) => ({

      ...base,

      color: '#f97316',

      fontSize: '0.75rem',

      fontWeight: 600,

      paddingLeft: '0.5rem',

    }),

    multiValueRemove: (base) => ({

      ...base,

      color: '#f97316',

      borderRadius: '9999px',

      ':hover': { backgroundColor: '#f97316', color: 'white' },

    }),

    indicatorSeparator: () => ({ display: 'none' }),

  }

}



interface MultiSelectProps extends Omit<ReactSelectProps<SelectOption, true>, 'isMulti' | 'options'> {

  options: SelectOption[]

  error?: boolean

  placeholder?: string

  isLoading?: boolean

}



export function MultiSelect({

  options,

  error,

  placeholder = 'Rechercher ou sélectionner...',

  isLoading,

  instanceId,

  ...props

}: MultiSelectProps) {

  return (

    <ReactSelect<SelectOption, true>

      instanceId={instanceId}

      isMulti

      options={options}

      placeholder={placeholder}

      isSearchable

      isClearable

      isLoading={isLoading}

      loadingMessage={() => 'Chargement...'}

      noOptionsMessage={() => 'Aucun résultat'}

      styles={buildMultiSelectStyles(error)}

      classNamePrefix="rs"

      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}

      menuPosition="fixed"

      {...props}

    />

  )

}



/** @deprecated Utiliser SelectSearch */

export const SingleSelect = SelectSearch



// ─────────────────────────────────────────────────────────────────────────────



interface FormFieldProps {

  label: string

  required?: boolean

  error?: string

  hint?: string

  children: React.ReactNode

}



export function FormField({ label, required, error, hint, children }: FormFieldProps) {

  return (

    <div>

      <label className="mb-2 block text-sm font-medium dark:text-white">

        <span className="inline-flex items-center gap-1.5">

          {label}

          {required && <span className="text-rose-500">*</span>}

          {hint && !error ? <HintTooltip text={hint} /> : null}

        </span>

      </label>

      {children}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

    </div>

  )

}



const inputClass =

  'py-3 px-4 block w-full border border-slate-200/80 rounded-lg text-sm focus:border-primary focus:ring-primary disabled:opacity-50 disabled:pointer-events-none dark:bg-surface-elevated-dark dark:border-border-dark dark:text-slate-200 dark:placeholder-slate-500 dark:focus:ring-neutral-600'



interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {

  error?: boolean

}

export function Input({ error, className = '', ...props }: InputProps) {

  return (

    <input

      {...props}

      className={`${inputClass} ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''} ${className}`}

    />

  )

}



interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {

  error?: boolean

}

export function Select({ error, className = '', children, ...props }: SelectProps) {

  return (

    <select {...props} className={`${inputClass} ${error ? 'border-red-400' : ''} ${className}`}>

      {children}

    </select>

  )

}



interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {

  error?: boolean

}

export function Textarea({ error, className = '', ...props }: TextareaProps) {

  return (

    <textarea

      {...props}

      className={`${inputClass} resize-none ${error ? 'border-red-400' : ''} ${className}`}

    />

  )

}



export { DatePicker } from '@/components/ui/DatePicker'

export type { DatePickerProps } from '@/components/ui/DatePicker'

export { DateField } from '@/components/ui/DateField'

export { NumberInput } from '@/components/ui/NumberInput'

export type { NumberInputProps } from '@/components/ui/NumberInput'

export { Switcher, SwitcherField, SwitcherGroup, Checkbox } from '@/components/ui/Switcher'

export type {
  SwitcherProps,
  SwitcherFieldProps,
  SwitcherGroupProps,
  SwitcherGroupOption,
} from '@/components/ui/Switcher'

export { default as FileUpload } from '@/components/ui/FileUpload'

export type { FileUploadProps, FileUploadItem, UploadHandler } from '@/components/ui/FileUpload'
