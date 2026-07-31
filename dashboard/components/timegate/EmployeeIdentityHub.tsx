'use client'

import type { Employee } from '@/lib/timegate/types'
import EmployeeNfcBadgeCard from './EmployeeNfcBadgeCard'
import EmployeePunchEligibilityCard from './EmployeePunchEligibilityCard'
import FaceEnrollCard from './FaceEnrollCard'

type Props = {
  employee: Employee
  onUpdated: () => void
}

export default function EmployeeIdentityHub({ employee, onUpdated }: Props) {
  return (
    <div className="space-y-4">
      <EmployeePunchEligibilityCard employee={employee} bare />
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <FaceEnrollCard
          bare
          employeeId={employee.id}
          hasFaceEmbedding={employee.hasFaceEmbedding}
          faceEnrolledAt={employee.faceEnrolledAt}
          onSuccess={onUpdated}
        />
        <EmployeeNfcBadgeCard
          bare
          employeeId={employee.id}
          hasNfcBadge={employee.hasNfcBadge}
          nfcBadgeUid={employee.nfcBadgeUid}
          onUpdated={onUpdated}
        />
      </div>
    </div>
  )
}
