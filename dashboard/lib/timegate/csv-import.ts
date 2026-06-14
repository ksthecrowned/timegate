const EMPLOYEE_CSV_COLUMNS = [
  'firstName',
  'lastName',
  'branchId',
  'email',
  'phone',
  'whatsappPhone',
  'birthDate',
  'hireDate',
  'gender',
  'nationality',
  'maritalStatus',
  'addressLine1',
  'addressLine2',
  'countryId',
  'cityId',
  'province',
  'postalCode',
  'emergencyContactName',
  'emergencyContactPhone',
  'nationalIdNumber',
  'passportNumber',
  'departmentId',
  'designationId',
  'defaultShiftId',
  'holidayListId',
  'isActive',
] as const

export type EmployeeCsvColumn = (typeof EMPLOYEE_CSV_COLUMNS)[number]

export type ParsedEmployeeCsvRow = Partial<Record<EmployeeCsvColumn, string>>

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

export function parseEmployeeCsv(text: string): ParsedEmployeeCsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((header) => header.trim())
  const rows: ParsedEmployeeCsvRow[] = []

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const values = parseCsvLine(lines[lineIndex])
    const row: ParsedEmployeeCsvRow = {}
    headers.forEach((header, index) => {
      const value = values[index]?.trim()
      if (value) row[header as EmployeeCsvColumn] = value
    })
    rows.push(row)
  }

  return rows
}

export function employeeCsvTemplate(): string {
  const header = EMPLOYEE_CSV_COLUMNS.join(',')
  const example =
    'Jean,Dupont,BRN-00001,jean.dupont@example.com,+242060000000,,1990-01-15,2024-03-01,M,Congo,,,,,,,,,,,,,,true'
  return `${header}\n${example}\n`
}

export function csvRowsToEmployeePayloads(rows: ParsedEmployeeCsvRow[]) {
  return rows.map((row, index) => {
    const firstName = row.firstName?.trim()
    const lastName = row.lastName?.trim()
    const branchId = row.branchId?.trim()

    if (!firstName || !lastName || !branchId) {
      throw new Error(`Ligne ${index + 2} : firstName, lastName et branchId sont requis`)
    }

    const payload: Record<string, unknown> = { firstName, lastName, branchId }

    for (const key of EMPLOYEE_CSV_COLUMNS) {
      if (key === 'firstName' || key === 'lastName' || key === 'branchId') continue
      const value = row[key]?.trim()
      if (!value) continue
      if (key === 'isActive') {
        payload.isActive = ['true', '1', 'yes', 'oui'].includes(value.toLowerCase())
      } else {
        payload[key] = value
      }
    }

    return payload
  })
}
