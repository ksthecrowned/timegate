'use client'

import EmployeeContractsCard from '@/components/timegate/EmployeeContractsCard'
import { FaceEnrollContent } from '@/components/timegate/FaceEnrollCard'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import {
    DateField,
    FormField,
    Input,
    NumberInput,
    SelectSearch,
    SwitcherField,
} from '@/components/ui/FormField'
import FormTabs from '@/components/ui/FormTabs'
import PhoneInput from '@/components/ui/PhoneInput'
import type { SelectOption } from '@/components/ui/select-search-types'
import { useOrganization } from '@/components/providers/OrganizationProvider'
import { normalizeApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listBranches } from '@/lib/timegate/branches'
import { listCities } from '@/lib/timegate/cities'
import { listCountries } from '@/lib/timegate/countries'
import type { EmployeePayload } from '@/lib/timegate/employees'
import { listPayGroups } from '@/lib/timegate/pay-groups'
import {
    listDepartments,
    listDesignations,
    listEmploymentTypes,
    listHolidayLists,
} from '@/lib/timegate/refs'
import { useEffect, useState } from 'react'

export type EmployeeFormValues = EmployeePayload

type EmployeeFormTab = 'identity' | 'contact' | 'assignment' | 'face' | 'contracts'

type CountryMeta = {
  name: string
  isoCode: string
  phoneCode?: string | null
}

const GENDER_OPTIONS: SelectOption[] = [
  { value: 'Male', label: 'Homme' },
  { value: 'Female', label: 'Femme' },
  { value: 'Other', label: 'Autre' },
]

const MARITAL_OPTIONS: SelectOption[] = [
  { value: 'Single', label: 'Célibataire' },
  { value: 'Married', label: 'Marié(e)' },
  { value: 'Divorced', label: 'Divorcé(e)' },
  { value: 'Widowed', label: 'Veuf(ve)' },
]

function EmployeeFormPlaceholder({ message }: { message: string }) {
  return <p className="text-sm text-gray-500 dark:text-neutral-400">{message}</p>
}

type EmployeeFormProps = {
  initial?: Partial<EmployeeFormValues>
  submitLabel: string
  onSubmit: (values: EmployeeFormValues) => Promise<void>
  onCancel?: () => void
  employeeId?: string
  hasFaceEmbedding?: boolean
  faceEnrolledAt?: string | null
}

export default function EmployeeForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  employeeId,
  hasFaceEmbedding,
  faceEnrolledAt,
}: EmployeeFormProps) {
  const { company } = useOrganization()
  const [tab, setTab] = useState<EmployeeFormTab>('identity')
  const [form, setForm] = useState<EmployeeFormValues>({
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    whatsappPhone: initial?.whatsappPhone ?? '',
    birthDate: normalizeApiDate(initial?.birthDate),
    hireDate: normalizeApiDate(initial?.hireDate),
    gender: initial?.gender ?? '',
    nationality: initial?.nationality ?? '',
    maritalStatus: initial?.maritalStatus ?? '',
    addressLine1: initial?.addressLine1 ?? '',
    addressLine2: initial?.addressLine2 ?? '',
    cityId: initial?.cityId ?? '',
    countryId: initial?.countryId ?? '',
    province: initial?.province ?? '',
    postalCode: initial?.postalCode ?? '',
    emergencyContactName: initial?.emergencyContactName ?? '',
    emergencyContactPhone: initial?.emergencyContactPhone ?? '',
    nationalIdNumber: initial?.nationalIdNumber ?? '',
    passportNumber: initial?.passportNumber ?? '',
    branchId: initial?.branchId ?? '',
    departmentId: initial?.departmentId ?? '',
    designationId: initial?.designationId ?? '',
    employmentTypeId: initial?.employmentTypeId ?? '',
    holidayListId: initial?.holidayListId ?? '',
    payGroupId: initial?.payGroupId ?? '',
    payDueDayOverride: initial?.payDueDayOverride ?? null,
    isActive: initial?.isActive ?? true,
  })
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<SelectOption[]>([])
  const [designationOptions, setDesignationOptions] = useState<SelectOption[]>([])
  const [employmentTypeOptions, setEmploymentTypeOptions] = useState<SelectOption[]>([])
  const [holidayListOptions, setHolidayListOptions] = useState<SelectOption[]>([])
  const [payGroupOptions, setPayGroupOptions] = useState<SelectOption[]>([])
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([])
  const [countryMetaById, setCountryMetaById] = useState<Record<string, CountryMeta>>({})
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.all([
      listBranches({ limit: 100 }),
      listDepartments(),
      listDesignations(),
      listEmploymentTypes(),
      listHolidayLists(),
      listCountries({ limit: 100 }),
      // Pay groups are ADMIN-only; MANAGER can reach this form (e.g. via kiosk-pin/nfc
      // sub-actions) but must not fail loading the other option lists if this 403s.
      listPayGroups({ limit: 100 }).catch(() => ({ data: [] as import('@/lib/timegate/types').PayGroup[] })),
    ]).then(([branches, departments, designations, employmentTypes, holidayLists, countries, payGroups]) => {
      setBranchOptions(toSelectOptions(branches.data))
      setDepartmentOptions(toSelectOptions(departments.data))
      setDesignationOptions(toSelectOptions(designations.data))
      setEmploymentTypeOptions(toSelectOptions(employmentTypes.data))
      setHolidayListOptions(toSelectOptions(holidayLists.data))
      setPayGroupOptions(
        toSelectOptions(
          payGroups.data.map((g) => ({
            id: g.id,
            name: g.isDefault ? `${g.name} (défaut)` : g.name,
          })),
        ),
      )
      setCountryOptions(countries.data.map((c) => ({ value: c.id, label: c.name })))
      setCountryMetaById(
        Object.fromEntries(
          countries.data.map((c) => [
            c.id,
            { name: c.name, isoCode: c.isoCode, phoneCode: c.phoneCode },
          ]),
        ),
      )
      setForm((prev) => {
        if (prev.payGroupId) return prev
        const defaultGroup =
          payGroups.data.find((g) => g.isDefault) ?? payGroups.data[0] ?? null
        if (!defaultGroup) return prev
        return { ...prev, payGroupId: defaultGroup.id }
      })
    })
  }, [])

  useEffect(() => {
    if (!form.countryId) {
      setCityOptions([])
      return
    }
    void listCities({ countryId: form.countryId, limit: 100 }).then((res) =>
      setCityOptions(res.data.map((c) => ({ value: c.id, label: c.name }))),
    )
  }, [form.countryId])

  const set = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  async function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setTab('identity')
      setError('Le prénom et le nom sont obligatoires.')
      return
    }
    if (!form.branchId) {
      setTab('assignment')
      setError('La branche est obligatoire.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { payGroupId, payDueDayOverride, ...baseForm } = form
      if (!payGroupId) {
        setTab('assignment')
        setError('Le groupe de paie est obligatoire.')
        return
      }
      await onSubmit({
        ...baseForm,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        whatsappPhone: form.whatsappPhone?.trim() || undefined,
        birthDate: form.birthDate || undefined,
        hireDate: form.hireDate || undefined,
        gender: form.gender || undefined,
        nationality: form.nationality?.trim() || undefined,
        maritalStatus: form.maritalStatus || undefined,
        addressLine1: form.addressLine1?.trim() || undefined,
        addressLine2: form.addressLine2?.trim() || undefined,
        cityId: form.cityId || undefined,
        countryId: form.countryId || undefined,
        province: form.province?.trim() || undefined,
        postalCode: form.postalCode?.trim() || undefined,
        emergencyContactName: form.emergencyContactName?.trim() || undefined,
        emergencyContactPhone: form.emergencyContactPhone?.trim() || undefined,
        nationalIdNumber: form.nationalIdNumber?.trim() || undefined,
        passportNumber: form.passportNumber?.trim() || undefined,
        branchId: form.branchId || undefined,
        departmentId: form.departmentId || undefined,
        designationId: form.designationId || undefined,
        employmentTypeId: form.employmentTypeId || undefined,
        holidayListId: form.holidayListId || null,
        payGroupId,
        payDueDayOverride,
      })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    {
      id: 'identity',
      label: 'Identité',
      content: () => (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Prénom *">
            <Input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
          </FormField>
          <FormField label="Nom *">
            <Input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </FormField>
          <FormField label="Date de naissance">
            <DateField value={form.birthDate ?? ''} onChange={(birthDate) => set('birthDate', birthDate)} />
          </FormField>
          <FormField label="Genre">
            <SelectSearch
              instanceId="employee-gender"
              options={GENDER_OPTIONS}
              value={findOption(GENDER_OPTIONS, form.gender ?? '')}
              onChange={(opt) => set('gender', opt?.value ?? '')}
              placeholder="Optionnel"
              isClearable
            />
          </FormField>
          <FormField label="Nationalité">
            <SelectSearch
              instanceId="employee-nationality"
              options={countryOptions}
              value={findOption(countryOptions, form.nationality ?? '')}
              onChange={(opt) => set('nationality', opt?.value ?? '')}
              placeholder="Sélectionner une nationalité…"
              isClearable
            />
          </FormField>
          <FormField label="Situation matrimoniale">
            <SelectSearch
              instanceId="employee-marital"
              options={MARITAL_OPTIONS}
              value={findOption(MARITAL_OPTIONS, form.maritalStatus ?? '')}
              onChange={(opt) => set('maritalStatus', opt?.value ?? '')}
              placeholder="Optionnel"
              isClearable
            />
          </FormField>
          <FormField label="N° carte d’identité">
            <Input
              value={form.nationalIdNumber ?? ''}
              onChange={(e) => set('nationalIdNumber', e.target.value)}
            />
          </FormField>
          <FormField label="N° passeport">
            <Input value={form.passportNumber ?? ''} onChange={(e) => set('passportNumber', e.target.value)} />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </FormField>
          <FormField
            label="Téléphone"
          >
            <PhoneInput
              value={form.phone ?? ''}
              onChange={(next) => set('phone', next)}
              countryIsoCode={countryMetaById[form.countryId ?? '']?.isoCode}
              organizationCountryIsoCode={(company as { countryIsoCode?: string | null } | null)?.countryIsoCode}
            />
          </FormField>
          <FormField label="WhatsApp">
            <PhoneInput
              value={form.whatsappPhone ?? ''}
              onChange={(next) => set('whatsappPhone', next)}
              countryIsoCode={countryMetaById[form.countryId ?? '']?.isoCode}
              organizationCountryIsoCode={(company as { countryIsoCode?: string | null } | null)?.countryIsoCode}
            />
          </FormField>
          <FormField label="Statut">
            <SwitcherField
              label="Employé actif"
              checked={form.isActive ?? true}
              onCheckedChange={(checked) => set('isActive', checked)}
            />
          </FormField>
        </div>
      ),
    },
    {
      id: 'contact',
      label: 'Coordonnées',
      content: () => (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormField label="Adresse ligne 1">
              <Input value={form.addressLine1 ?? ''} onChange={(e) => set('addressLine1', e.target.value)} />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="Adresse ligne 2">
              <Input value={form.addressLine2 ?? ''} onChange={(e) => set('addressLine2', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Pays">
            <SelectSearch
              instanceId="employee-country"
              options={countryOptions}
              value={findOption(countryOptions, form.countryId ?? '')}
              onChange={(opt) => set('countryId', opt?.value ?? '')}
              isClearable
            />
          </FormField>
          <FormField label="Ville">
            <SelectSearch
              instanceId="employee-city"
              options={cityOptions}
              value={findOption(cityOptions, form.cityId ?? '')}
              onChange={(opt) => set('cityId', opt?.value ?? '')}
              isDisabled={!form.countryId}
              isClearable
            />
          </FormField>
          <FormField label="Province">
            <Input value={form.province ?? ''} onChange={(e) => set('province', e.target.value)} />
          </FormField>
          <FormField label="Code postal">
            <Input value={form.postalCode ?? ''} onChange={(e) => set('postalCode', e.target.value)} />
          </FormField>
          <FormField label="Contact d’urgence">
            <Input
              value={form.emergencyContactName ?? ''}
              onChange={(e) => set('emergencyContactName', e.target.value)}
            />
          </FormField>
          <FormField label="Tél. urgence">
            <PhoneInput
              value={form.emergencyContactPhone ?? ''}
              onChange={(next) => set('emergencyContactPhone', next)}
              countryIsoCode={countryMetaById[form.countryId ?? '']?.isoCode}
              organizationCountryIsoCode={(company as { countryIsoCode?: string | null } | null)?.countryIsoCode}
            />
          </FormField>
        </div>
      ),
    },
    {
      id: 'assignment',
      label: 'Affectation RH',
      content: () => (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Branche *">
            <SelectSearch
              instanceId="employee-branch"
              options={branchOptions}
              value={findOption(branchOptions, form.branchId ?? '')}
              onChange={(opt) => {
                set('branchId', opt?.value ?? '')
              }}
              placeholder="Sélectionner une branche…"
            />
          </FormField>
          <FormField label="Date d’embauche">
            <DateField value={form.hireDate ?? ''} onChange={(hireDate) => set('hireDate', hireDate)} />
          </FormField>
          <FormField label="Département">
            <SelectSearch
              instanceId="employee-department"
              options={departmentOptions}
              value={findOption(departmentOptions, form.departmentId ?? '')}
              onChange={(opt) => set('departmentId', opt?.value ?? '')}
              placeholder="Optionnel"
              isClearable
            />
          </FormField>
          <FormField label="Poste">
            <SelectSearch
              instanceId="employee-designation"
              options={designationOptions}
              value={findOption(designationOptions, form.designationId ?? '')}
              onChange={(opt) => set('designationId', opt?.value ?? '')}
              placeholder="Optionnel"
              isClearable
            />
          </FormField>
          <FormField label="Type de contrat">
            <SelectSearch
              instanceId="employee-employment-type"
              options={employmentTypeOptions}
              value={findOption(employmentTypeOptions, form.employmentTypeId ?? '')}
              onChange={(opt) => set('employmentTypeId', opt?.value ?? '')}
              placeholder="CDI, CDD, stage…"
              isClearable
            />
          </FormField>
          <div className="md:col-span-2 rounded-lg border border-slate-200/80 bg-slate-50 p-3 text-sm text-slate-600 dark:border-border-dark dark:bg-white/5 dark:text-neutral-300">
            Pour le planning et le pointage, créez une{' '}
            <a href="/shift-assignments/new" className="font-medium text-primary hover:underline">
              affectation
            </a>{' '}
            (employé → horaire). Les jours et heures viennent de l’horaire.
          </div>
          <FormField label="Liste de jours fériés">
            <SelectSearch
              instanceId="employee-holiday-list"
              options={holidayListOptions}
              value={findOption(holidayListOptions, form.holidayListId ?? '')}
              onChange={(opt) => set('holidayListId', opt?.value ?? '')}
              placeholder="Par défaut (entreprise)"
              isClearable
            />
          </FormField>
          <FormField label="Groupe de paie *" hint="Obligatoire — les nouveaux employés prennent le groupe par défaut.">
            <SelectSearch
              instanceId="employee-pay-group"
              options={payGroupOptions}
              value={findOption(payGroupOptions, form.payGroupId ?? '')}
              onChange={(opt) => set('payGroupId', opt?.value ?? '')}
              placeholder="Choisir un groupe"
            />
          </FormField>
          <FormField
            label="Jour de paie (override)"
            hint="Remplace le jour du groupe pour cet employé (1–28)."
          >
            <NumberInput
              min={1}
              max={28}
              step={1}
              value={form.payDueDayOverride ?? ''}
              onValueChange={(raw) =>
                set('payDueDayOverride', raw === '' ? null : Number(raw))
              }
            />
          </FormField>
        </div>
      ),
    },
    {
      id: 'face',
      label: 'Reconnaissance faciale',
      content: () =>
        employeeId ? (
          <FaceEnrollContent
            employeeId={employeeId}
            hasFaceEmbedding={hasFaceEmbedding}
            faceEnrolledAt={faceEnrolledAt}
          />
        ) : (
          <EmployeeFormPlaceholder message="Enregistrez l’employé pour configurer la reconnaissance faciale." />
        ),
    },
    {
      id: 'contracts',
      label: 'Contrats',
      content: () =>
        employeeId ? (
          <EmployeeContractsCard employeeId={employeeId} embedded />
        ) : (
          <EmployeeFormPlaceholder message="Enregistrez l’employé pour gérer les contrats." />
        ),
    },
  ]

  function handleFormKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || tab === 'contracts' || tab === 'face') return
    const target = e.target as HTMLElement
    if (target.tagName === 'TEXTAREA' || target.closest('[role="combobox"]')) return
    e.preventDefault()
    void handleSubmit()
  }

  return (
    <FormCard
      title="Informations employé"
      footer={
        <>
          {onCancel && (
            <button type="button" onClick={onCancel} className={secondaryBtnClass}>
              Annuler
            </button>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleSubmit()}
            className={primaryBtnClass}
          >
            {loading ? 'Enregistrement…' : submitLabel}
          </button>
        </>
      }
    >
      <div onKeyDown={handleFormKeyDown}>
        <ApiErrorBanner message={error} />
        <FormTabs tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as EmployeeFormTab)} />
      </div>
    </FormCard>
  )
}
