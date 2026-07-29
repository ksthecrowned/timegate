'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'

import ReactSelect, {
  components,
  createFilter,
  type ClassNamesConfig,
  type ControlProps,
  type DropdownIndicatorProps,
  type GroupBase,
  type MenuListProps,
  type OptionProps,
  type Props as ReactSelectProps,
  type SingleValueProps,
} from 'react-select'

import type { SelectOption } from '@/components/ui/select-search-types'

export type { SelectOption } from '@/components/ui/select-search-types'

const defaultFilter = createFilter<SelectOption>({ ignoreAccents: true, trim: true })

const chevronIcon = (
  <svg
    className="shrink-0 size-3.5 text-slate-500 dark:text-slate-400"
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </svg>
)

function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function OptionLabel({
  icon,
  label,
  iconSize = 'md',
}: {
  icon?: string
  label: string
  iconSize?: 'sm' | 'md'
}) {
  const iconBox = iconSize === 'sm' ? 'size-5' : 'size-8'
  return (
    <div className="flex items-center min-w-0">
      {icon ? (
        <div
          className={cn(
            iconBox,
            'me-2 flex-none overflow-hidden rounded-full border border-slate-200/80 dark:border-border-dark',
          )}
        >
          <img
            src={icon}
            alt=""
            className="inline-block rounded-full max-w-full h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      ) : null}
      <div className="truncate text-slate-800 dark:text-slate-200">{label}</div>
    </div>
  )
}

function CustomOption(props: OptionProps<SelectOption, false, GroupBase<SelectOption>>) {
  return (
    <components.Option {...props}>
      <OptionLabel icon={props.data.icon} label={props.data.label} iconSize="md" />
    </components.Option>
  )
}

function CustomSingleValue(props: SingleValueProps<SelectOption, false, GroupBase<SelectOption>>) {
  return (
    <components.SingleValue {...props}>
      <OptionLabel icon={props.data.icon} label={props.data.label} iconSize="sm" />
    </components.SingleValue>
  )
}

function ChevronDropdownIndicator(
  props: DropdownIndicatorProps<SelectOption, false, GroupBase<SelectOption>>,
) {
  return <components.DropdownIndicator {...props}>{chevronIcon}</components.DropdownIndicator>
}

function CustomControl(props: ControlProps<SelectOption, false, GroupBase<SelectOption>>) {
  const { selectProps, innerProps, isDisabled } = props

  return (
    <components.Control
      {...props}
      innerProps={{
        ...innerProps,
        onMouseDown: (event) => {
          if (isDisabled) return
          event.preventDefault()
          if (selectProps.menuIsOpen) {
            selectProps.onMenuClose()
          } else {
            selectProps.onMenuOpen()
          }
        },
        onTouchEnd: (event) => {
          if (isDisabled) return
          event.preventDefault()
          if (selectProps.menuIsOpen) {
            selectProps.onMenuClose()
          } else {
            selectProps.onMenuOpen()
          }
        },
      }}
    />
  )
}

function SearchMenuList(props: MenuListProps<SelectOption, false, GroupBase<SelectOption>>) {
  const { selectProps, children } = props

  return (
    <components.MenuList {...props}>
      <div className={selectSearchMenuStyles.searchWrapper}>
        <input
          type="text"
          autoFocus
          placeholder="Rechercher..."
          className={selectSearchMenuStyles.searchInput}
          value={selectProps.inputValue}
          onChange={(e) =>
            selectProps.onInputChange(e.currentTarget.value, {
              action: 'input-change',
              prevInputValue: selectProps.inputValue,
            })
          }
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>
      {children}
    </components.MenuList>
  )
}

function buildClassNames(
  error?: boolean,
  variant: 'default' | 'toolbar' = 'default',
): ClassNamesConfig<SelectOption, false, GroupBase<SelectOption>> {
  const isToolbar = variant === 'toolbar'
  return {
    container: () => 'relative w-full',
    control: ({ isFocused, isDisabled }) =>
      cn(
        'relative flex gap-x-2 text-nowrap w-full cursor-pointer border rounded-lg text-start',
        isToolbar
          ? 'py-1.5 px-2.5 text-sm border-slate-200/80 bg-surface dark:bg-surface-dark dark:border-border-dark dark:text-slate-200'
          : 'py-3 px-4 text-sm bg-surface border-slate-200 dark:bg-surface-dark dark:border-border-dark dark:text-slate-300',
        'focus:outline-none',
        isFocused &&
          (isToolbar
            ? 'ring-1 ring-primary/40 border-primary/40'
            : 'ring-2 ring-primary dark:ring-1 dark:ring-neutral-600'),
        isDisabled && 'pointer-events-none opacity-50',
        error && 'border-red-400 ring-red-400',
      ),
    valueContainer: () => 'p-0 gap-x-2 flex-1 min-w-0',
    placeholder: () =>
      cn('truncate', isToolbar ? 'text-slate-600 dark:text-slate-300' : 'text-slate-800 dark:text-slate-300'),
    singleValue: () => 'truncate text-slate-800 dark:text-slate-200',
    indicatorsContainer: () => 'items-center shrink-0',
    dropdownIndicator: () => 'p-0 text-slate-500 dark:text-slate-400',
    clearIndicator: () => 'p-0 text-slate-400 hover:text-primary dark:hover:text-teal-300',
    menu: () =>
      cn(
        'mt-2 z-50 w-full min-w-[var(--select-width,100%)] bg-surface-card border border-slate-200 rounded-lg shadow-lg',
        'dark:bg-surface-card-dark dark:border-border-dark',
      ),
    menuList: () => 'p-1 max-h-64 overflow-y-auto',
    option: ({ isFocused, isSelected }) =>
      cn(
        'py-2 px-4 w-full text-sm text-slate-800 cursor-pointer rounded-lg dark:text-slate-200',
        isFocused && !isSelected && 'bg-slate-100 dark:bg-border-dark',
        isSelected && 'bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary',
      ),
    group: () => 'p-0',
    loadingMessage: () => 'py-2 px-4 text-sm text-slate-500 dark:text-slate-400',
    noOptionsMessage: () => 'py-2 px-4 text-sm text-slate-500 dark:text-slate-400',
    menuPortal: () => 'z-[9999]',
  }
}

/** Styles du champ de recherche injecté en tête du menu. */
export const selectSearchMenuStyles = {
  searchWrapper:
    'bg-surface-card p-2 sticky top-0 z-10 dark:bg-surface-card-dark border-b border-slate-100 dark:border-border-dark',
  searchInput:
    'block w-full rounded-lg border border-slate-200 text-sm bg-surface px-3 py-2 focus:border-primary focus:ring-primary dark:bg-surface-dark dark:border-border-dark dark:text-slate-200 dark:placeholder-slate-500',
}

export interface SelectSearchProps
  extends Omit<ReactSelectProps<SelectOption, false, GroupBase<SelectOption>>, 'isMulti' | 'options'> {
  options: SelectOption[]
  error?: boolean
  placeholder?: string
  isLoading?: boolean
  /** Afficher les icônes (auto = si au moins une option a `icon`). */
  showIcons?: boolean | 'auto'
  /** Validation HTML5 native via input caché. */
  required?: boolean
  /** `toolbar` : hauteur réduite pour barres d’outils (inbox, filtres). */
  variant?: 'default' | 'toolbar'
}

export function SelectSearch({
  options,
  error,
  placeholder = 'Sélectionnez...',
  isLoading,
  instanceId,
  showIcons = 'auto',
  required,
  variant = 'default',
  components: userComponents,
  onMenuClose,
  onMenuOpen,
  onInputChange,
  onChange,
  value,
  ...props
}: SelectSearchProps) {
  const fallbackId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const menuPortalTarget = typeof document !== 'undefined' ? document.body : null
  const [searchInput, setSearchInput] = useState('')
  const [menuIsOpen, setMenuIsOpen] = useState(false)

  const hasIcons = showIcons === 'auto' ? options.some((o) => Boolean(o.icon)) : Boolean(showIcons)
  const selectedValue =
    value && typeof value === 'object' && 'value' in value ? String(value.value ?? '') : ''

  const handleMenuOpen = useCallback(() => {
    setMenuIsOpen(true)
    onMenuOpen?.()
  }, [onMenuOpen])

  const handleMenuClose = useCallback(() => {
    setMenuIsOpen(false)
    setSearchInput('')
    onMenuClose?.()
  }, [onMenuClose])

  const selectId = instanceId ?? fallbackId

  useEffect(() => {
    if (!menuIsOpen) return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      const menu = document.getElementById(`react-select-${selectId}-listbox`)

      if (containerRef.current?.contains(target) || menu?.contains(target)) return
      handleMenuClose()
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [menuIsOpen, handleMenuClose, selectId])

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          className="sr-only absolute h-0 w-0 opacity-0 pointer-events-none"
          value={selectedValue}
          onChange={() => undefined}
          required
        />
      ) : null}
      <ReactSelect<SelectOption, false>
        {...props}
        value={value}
        instanceId={selectId}
        unstyled
        classNames={buildClassNames(error, variant)}
        options={options}
        placeholder={placeholder}
        isSearchable={false}
        openMenuOnClick
        openMenuOnFocus={false}
        menuIsOpen={menuIsOpen}
        isClearable={props.isClearable ?? false}
        isLoading={isLoading}
        menuPosition="fixed"
        menuPortalTarget={menuPortalTarget ?? undefined}
        menuPlacement="auto"
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        }}
        inputValue={searchInput}
        onInputChange={(nextValue, meta) => {
          setSearchInput(nextValue)
          onInputChange?.(nextValue, meta)
        }}
        onMenuOpen={handleMenuOpen}
        onMenuClose={handleMenuClose}
        onChange={(option, actionMeta) => {
          onChange?.(option, actionMeta)
          if (actionMeta.action === 'select-option') {
            handleMenuClose()
          }
        }}
        getOptionLabel={(option) => option.label}
        getOptionValue={(option) => option.value}
        filterOption={defaultFilter}
        loadingMessage={() => 'Chargement...'}
        noOptionsMessage={() => 'Aucun résultat'}
        components={{
          Control: CustomControl,
          MenuList: SearchMenuList,
          Option: CustomOption,
          SingleValue: hasIcons ? CustomSingleValue : components.SingleValue,
          DropdownIndicator: ChevronDropdownIndicator,
          IndicatorSeparator: () => null,
          ...userComponents,
        }}
      />
    </div>
  )
}
