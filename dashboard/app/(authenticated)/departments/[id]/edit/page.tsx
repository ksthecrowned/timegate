'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import NamedEntityForm from '@/components/timegate/NamedEntityForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getDepartment, updateDepartment } from '@/lib/timegate/departments'
import type { Department } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EditDepartmentPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getDepartment(id)
      .then(setRow)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Introuvable.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Départements', href: '/departments' }, { label: row?.name ?? '…', href: `/departments/${id}` }, { label: 'Modifier' }]} />
      <ApiErrorBanner message={error} />
      {loading ? <SkeletonDetailCard /> : row ? (
        <NamedEntityForm
          title="Département"
          submitLabel="Enregistrer"
          initial={{ name: row.name }}
          onCancel={() => router.push(`/departments/${id}`)}
          onSubmit={async (values) => {
            await updateDepartment(id, values)
            router.push(`/departments/${id}`)
          }}
        />
      ) : null}
    </div>
  )
}

