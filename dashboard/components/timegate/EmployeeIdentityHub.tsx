'use client'

import type { Employee } from '@/lib/timegate/types'
import EmployeeKioskPinCard from './EmployeeKioskPinCard'
import EmployeeNfcBadgeCard from './EmployeeNfcBadgeCard'
import EmployeePunchEligibilityCard from './EmployeePunchEligibilityCard'
import FaceEnrollCard from './FaceEnrollCard'

type Props = {
  employee: Employee
  onUpdated: () => void
}

export default function EmployeeIdentityHub({ employee, onUpdated }: Props) {
  return (
    <div className="space-y-0">
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        Identité & pointage kiosk
      </h2>
      <EmployeePunchEligibilityCard employee={employee} />
      <div className="grid grid-cols-2 gap-4">
        <FaceEnrollCard
          employeeId={employee.id}
          hasFaceEmbedding={employee.hasFaceEmbedding}
          onSuccess={onUpdated}
        />
        <EmployeeNfcBadgeCard
          employeeId={employee.id}
          hasNfcBadge={employee.hasNfcBadge}
          nfcBadgeUid={employee.nfcBadgeUid}
          onUpdated={onUpdated}
        />
        <EmployeeKioskPinCard
          employeeId={employee.id}
          hasKioskPin={employee.hasKioskPin}
          onUpdated={onUpdated}
        />
      </div>
    </div>
  )
}
