'use client'

import EmployeeCompensationItemsCard from '@/components/timegate/EmployeeCompensationItemsCard'
import EmployeeCompensationSummaryCard from '@/components/timegate/EmployeeCompensationSummaryCard'
import EmployeeContractsCard from '@/components/timegate/EmployeeContractsCard'
import EmployeeIdentityHub from '@/components/timegate/EmployeeIdentityHub'
import EmployeeLeaveBalancesCard from '@/components/timegate/EmployeeLeaveBalancesCard'
import EmployeePortalAccessCard from '@/components/timegate/EmployeePortalAccessCard'
import EmployeeSalaryAdvancesCard from '@/components/timegate/EmployeeSalaryAdvancesCard'
import EmployeeTrustedDevicesCard from '@/components/timegate/EmployeeTrustedDevicesCard'
import ResourceDetailSection from '@/components/timegate/ResourceDetailSection'
import ResourceProfileHeader from '@/components/timegate/ResourceProfileHeader'
import WriteLink from '@/components/timegate/WriteLink'
import { ApiErrorBanner, primaryBtnClass } from '@/components/timegate/ui'
import ActionButtons from '@/components/ui/ActionButtons'
import FormTabs, { type FormTabItem } from '@/components/ui/FormTabs'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import { formatApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import {
  employeeGenderLabel,
  employeeMaritalLabel,
} from '@/lib/timegate/employee-labels'
import { deleteEmployee, getEmployee } from '@/lib/timegate/employees'
import type { Employee } from '@/lib/timegate/types'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

type DetailTab = 'profile' | 'punch' | 'access' | 'contracts' | 'pay'

const DETAIL_TABS: DetailTab[] = ['profile', 'punch', 'access', 'contracts', 'pay']

function parseDetailTab(value: string | null): DetailTab {
  if (value && DETAIL_TABS.includes(value as DetailTab)) return value as DetailTab
  return 'profile'
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params.id
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [compRefreshKey, setCompRefreshKey] = useState(0)
  const [tab, setTab] = useState<DetailTab>(() => parseDetailTab(searchParams.get('tab')))

  useEffect(() => {
    setTab(parseDetailTab(searchParams.get('tab')))
  }, [searchParams])

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

  const tabs: FormTabItem[] = useMemo(() => {
    if (!employee) return []
    return [
      {
        id: 'profile',
        label: 'Fiche',
        content: (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <ResourceDetailSection
                bare
                title="Identité"
                items={[
                  { label: 'Email', value: employee.email },
                  { label: 'Téléphone', value: employee.phone },
                  { label: 'WhatsApp', value: employee.whatsappPhone },
                  { label: 'Date de naissance', value: formatApiDate(employee.birthDate) },
                  { label: 'Genre', value: employeeGenderLabel(employee.gender) },
                  { label: 'Nationalité', value: employee.nationality },
                  {
                    label: 'Situation matrimoniale',
                    value: employeeMaritalLabel(employee.maritalStatus),
                  },
                  { label: 'Carte d’identité', value: employee.nationalIdNumber },
                  { label: 'Passeport', value: employee.passportNumber },
                ]}
              />
              <ResourceDetailSection
                bare
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
            <div className="grid gap-4 lg:grid-cols-2">
              <ResourceDetailSection
                bare
                title="Affectation RH"
                items={[
                  { label: 'Branche', value: employee.branch?.name },
                  { label: 'Département', value: employee.department },
                  { label: 'Poste', value: employee.designation },
                  { label: 'Type d’emploi', value: employee.employmentType },
                  { label: 'Date d’embauche', value: formatApiDate(employee.hireDate) },
                  {
                    label: 'Jours fériés',
                    value: employee.holidayList?.name ?? 'Par défaut (entreprise)',
                  },
                  {
                    label: 'Groupe de paie',
                    value: employee.payGroup?.name ?? '—',
                  },
                ]}
              />
              <EmployeeLeaveBalancesCard employeeId={employee.id} bare />
            </div>
          </div>
        ),
      },
      {
        id: 'punch',
        label: 'Pointage',
        content: <EmployeeIdentityHub employee={employee} onUpdated={() => void load()} />,
      },
      {
        id: 'access',
        label: 'Accès',
        content: (
          <div className="grid gap-4 lg:grid-cols-2">
            <EmployeePortalAccessCard bare employee={employee} onUpdated={() => void load()} />
            <EmployeeTrustedDevicesCard bare employeeId={employee.id} />
          </div>
        ),
      },
      {
        id: 'contracts',
        label: 'Contrats',
        content: <EmployeeContractsCard employeeId={employee.id} embedded />,
      },
      {
        id: 'pay',
        label: 'Rémunération',
        content: (
          <div className="space-y-4">
            <EmployeeCompensationSummaryCard
              bare
              employeeId={employee.id}
              refreshKey={compRefreshKey}
            />
            <EmployeeCompensationItemsCard
              bare
              employeeId={employee.id}
              onChanged={() => setCompRefreshKey((k) => k + 1)}
            />
            <EmployeeSalaryAdvancesCard
              bare
              employeeId={employee.id}
            />
          </div>
        ),
      },
    ]
  }, [employee, compRefreshKey, load])

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
        <div className="tg-card overflow-hidden">
          <ResourceProfileHeader
            embedded
            title={fullName}
            subtitle={
              [employee.designation, employee.department].filter(Boolean).join(' · ') || undefined
            }
            meta={employee.branch?.name ?? undefined}
            photoUrl={employee.photoUrl}
            initials={`${employee.firstName?.[0] ?? ''}${employee.lastName?.[0] ?? ''}`}
            isActive={employee.isActive}
          >
            <WriteLink href={`/employees/${id}/edit`} className={primaryBtnClass}>
              Modifier
            </WriteLink>
            <ActionButtons
              onDelete={() => void handleDelete()}
              deleteMessage="Cet employé sera définitivement supprimé."
            />
          </ResourceProfileHeader>

          <div className="border-t border-slate-200/80 px-4 pb-5 md:px-5 dark:border-border-dark">
            <FormTabs
              tabs={tabs}
              activeTab={tab}
              onTabChange={(nextTab) => {
                const next = nextTab as DetailTab
                setTab(next)
                const nextParams = new URLSearchParams(searchParams.toString())
                if (next === 'profile') nextParams.delete('tab')
                else nextParams.set('tab', next)
                const qs = nextParams.toString()
                router.replace(qs ? `/employees/${id}?${qs}` : `/employees/${id}`, {
                  scroll: false,
                })
              }}
              flush
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
