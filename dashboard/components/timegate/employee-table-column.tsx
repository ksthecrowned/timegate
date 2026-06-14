import type { Column } from '@/components/ui/DataTable'
import EmployeeTableCell from '@/components/timegate/EmployeeTableCell'
import type { EmployeeSummary } from '@/lib/timegate/types'

type EmployeeRow = {
  employee?: EmployeeSummary | null
  employeeName?: string | null
}

export function employeeTableColumn<T extends EmployeeRow>(
  options?: {
    sortable?: boolean
    getEmployee?: (row: T) => EmployeeSummary | null | undefined
    getFallbackName?: (row: T) => string | null | undefined
  },
): Column<T> {
  return {
    key: 'employee',
    label: 'Employé',
    sortable: options?.sortable,
    render: (_, row) => (
      <EmployeeTableCell
        employee={options?.getEmployee?.(row) ?? row.employee}
        fallbackName={options?.getFallbackName?.(row) ?? row.employeeName}
      />
    ),
  }
}
