'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import NamedEntityForm from '@/components/timegate/NamedEntityForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getEmploymentType, updateEmploymentType } from '@/lib/timegate/employment-types'
import type { EmploymentType } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EditEmploymentTypePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<EmploymentType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getEmploymentType(id)
      .then(setRow)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Introuvable.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Types de contrat', href: '/employment-types' },
          { label: row?.name ?? '…', href: `/employment-types/${id}` },
          { label: 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <NamedEntityForm
          title="Type de contrat"
          submitLabel="Enregistrer"
          initial={{ name: row.name }}
          onCancel={() => router.push(`/employment-types/${id}`)}
          onSubmit={async (values) => {
            await updateEmploymentType(id, values)
            router.push(`/employment-types/${id}`)
          }}
        />
      ) : null}
    </div>
  )
}
