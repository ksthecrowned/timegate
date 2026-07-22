'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import EmployeeIdentityHub from '@/components/timegate/EmployeeIdentityHub'
import EmployeeTrustedDevicesCard from '@/components/timegate/EmployeeTrustedDevicesCard'
import EmployeePortalAccessCard from '@/components/timegate/EmployeePortalAccessCard'
import EmployeeContractsCard from '@/components/timegate/EmployeeContractsCard'
import EmployeeLeaveBalancesCard from '@/components/timegate/EmployeeLeaveBalancesCard'
import ResourceDetailSection from '@/components/timegate/ResourceDetailSection'
import ResourceProfileHeader from '@/components/timegate/ResourceProfileHeader'
import WriteLink from '@/components/timegate/WriteLink'
import { ApiErrorBanner, primaryBtnClass } from '@/components/timegate/ui'
import { deleteEmployee, getEmployee } from '@/lib/timegate/employees'
import type { Employee } from '@/lib/timegate/types'
import { formatApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setEmployee(await getEmployee(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Employé introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleDelete() {
    await deleteEmployee(id)
    router.push('/employees')
  }

  const fullName = employee ? `${employee.firstName} ${employee.lastName}`.trim() : ''

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Employés', href: '/employees' },
          { label: employee ? fullName : 'Détail' },
        ]}
      />

      <ApiErrorBanner message={error} />

      {loading ? (
        <SkeletonDetailCard />
      ) : employee ? (
        <div className="space-y-0">
          <ResourceProfileHeader
            title={fullName}
            subtitle={[employee.designation, employee.department].filter(Boolean).join(' · ') || undefined}
            meta={employee.branch?.name ?? undefined}
            photoUrl={employee.photoUrl}
            initials={`${employee.firstName?.[0] ?? ''}${employee.lastName?.[0] ?? ''}`}
            isActive={employee.isActive}
          >
            <div className="flex gap-2 pb-1">
              <WriteLink href={`/employees/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </WriteLink>
              <ActionButtons
                onDelete={() => void handleDelete()}
                deleteMessage="Cet employé sera définitivement supprimé."
              />
            </div>
          </ResourceProfileHeader>
          <div className="h-6" />

          <div className="grid gap-6 lg:grid-cols-2">
            <ResourceDetailSection
              title="Identité"
              items={[
                { label: 'Email', value: employee.email },
                { label: 'Téléphone', value: employee.phone },
                { label: 'WhatsApp', value: employee.whatsappPhone },
                { label: 'Date de naissance', value: formatApiDate(employee.birthDate) },
                { label: 'Genre', value: employee.gender },
                { label: 'Nationalité', value: employee.nationality },
                { label: 'Situation matrimoniale', value: employee.maritalStatus },
                { label: 'Carte d’identité', value: employee.nationalIdNumber },
                { label: 'Passeport', value: employee.passportNumber },
              ]}
            />
            <ResourceDetailSection
              title="Coordonnées"
              items={[
                { label: 'Adresse', value: employee.addressLine1 },
                { label: 'Complément', value: employee.addressLine2 },
                { label: 'Ville', value: employee.city?.name },
                { label: 'Province', value: employee.province },
                { label: 'Pays', value: employee.country?.name },
                { label: 'Code postal', value: employee.postalCode },
                { label: 'Contact urgence', value: employee.emergencyContactName },
                { label: 'Tél. urgence', value: employee.emergencyContactPhone },
              ]}
            />
          </div>

          <ResourceDetailSection
            title="Affectation RH"
            items={[
              { label: 'Branche', value: employee.branch?.name },
              { label: 'Département', value: employee.department },
              { label: 'Poste', value: employee.designation },
              { label: 'Date d’embauche', value: formatApiDate(employee.hireDate) },
              { label: 'Horaire par défaut', value: employee.defaultShift?.name },
              {
                label: 'Jours fériés',
                value: employee.holidayList?.name ?? 'Par défaut (entreprise)',
              },
            ]}
          />

          <EmployeeLeaveBalancesCard employeeId={employee.id} />

          <EmployeeIdentityHub employee={employee} onUpdated={() => void load()} />

          <EmployeePortalAccessCard employee={employee} onUpdated={() => void load()} />

          <EmployeeTrustedDevicesCard employeeId={employee.id} />

          <EmployeeContractsCard employeeId={employee.id} />
        </div>
      ) : null}
    </div>
  )
}
