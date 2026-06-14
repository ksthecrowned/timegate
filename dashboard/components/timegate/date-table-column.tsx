import type { Column } from '@/components/ui/DataTable'
import { formatApiDate, formatApiDateTime } from '@/lib/date-utils'

type DateColumnOptions = {
  sortable?: boolean
  filterable?: boolean
  filterPlaceholder?: string
}

export function dateTableColumn<T>(
  key: keyof T & string,
  label = 'Date',
  options?: DateColumnOptions,
): Column<T> {
  return {
    key,
    label,
    sortable: options?.sortable,
    filterable: options?.filterable,
    filterPlaceholder: options?.filterPlaceholder,
    render: (v) => formatApiDate(v == null ? null : String(v)),
  }
}

export function dateTimeTableColumn<T>(
  key: keyof T & string,
  label = 'Date',
  options?: Pick<DateColumnOptions, 'sortable'>,
): Column<T> {
  return {
    key,
    label,
    sortable: options?.sortable,
    render: (v) => formatApiDateTime(v == null ? null : String(v)),
  }
}
