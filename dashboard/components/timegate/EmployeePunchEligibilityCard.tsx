'use client'

import type { Employee } from '@/lib/timegate/types'
import { DetailCard, DetailRow } from './ui'

type Props = {
  employee: Employee
}

function punchMethods(employee: Employee): string[] {
  const methods: string[] = []
  if (employee.hasFaceEmbedding) methods.push('Visage')
  if (employee.hasNfcBadge) methods.push('NFC')
  if (employee.hasQrPunchToken) methods.push('QR')
  if (employee.hasKioskPin) methods.push('PIN')
  return methods
}

export default function EmployeePunchEligibilityCard({ employee }: Props) {
  const methods = punchMethods(employee)
  const reasons: string[] = []

  if (!employee.isActive || employee.status !== 'ACTIVE') {
    reasons.push('Employé inactif')
  }
  if (!employee.branchId) {
    reasons.push('Aucun site d’affectation')
  }
  if (methods.length === 0) {
    reasons.push('Aucune méthode de pointage configurée')
  }

  const canPunch = reasons.length === 0

  return (
    <DetailCard title="Pointage kiosk">
      <DetailRow
        label="Peut pointer"
        value={
          <span className={canPunch ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
            {canPunch ? 'Oui' : 'Non'}
          </span>
        }
      />
      <DetailRow label="Méthodes actives" value={methods.length ? methods.join(', ') : '—'} />
      {!canPunch ? (
        <DetailRow label="Motifs" value={reasons.join(' · ')} />
      ) : null}
      <DetailRow
        label="Compte utilisateur"
        value={
          employee.linkedUser
            ? employee.linkedUser.email
            : employee.userId
              ? employee.userId
              : '—'
        }
      />
    </DetailCard>
  )
}
