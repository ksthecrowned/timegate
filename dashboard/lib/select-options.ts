import type { SelectOption } from '@/components/ui/select-search-types'

/** Mappe une liste API `{ id, name }` vers react-select. */
export function toSelectOptions(
  items: Array<{
    id?: string
    name?: string
    label?: string
    value?: string
    icon?: string
    logo?: string
  }>,
): SelectOption[] {
  return items.map((item) => ({
    value: item.id ?? item.value ?? '',
    label: item.name ?? item.label ?? String(item.id ?? item.value ?? ''),
    icon: item.icon ?? item.logo,
  }))
}

export function findOption(options: SelectOption[], value: string): SelectOption | null {
  console.log('value', value)
  if (!value) return null
  return options.find((o) => o.value === value) ?? null
}
