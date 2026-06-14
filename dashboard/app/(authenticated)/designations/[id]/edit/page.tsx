'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import NamedEntityForm from '@/components/timegate/NamedEntityForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getDesignation, updateDesignation } from '@/lib/timegate/designations'
import type { Designation } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EditDesignationPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<Designation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getDesignation(id)
      .then(setRow)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Introuvable.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Postes', href: '/designations' }, { label: row?.name ?? '…', href: `/designations/${id}` }, { label: 'Modifier' }]} />
      <ApiErrorBanner message={error} />
      {loading ? <SkeletonDetailCard /> : row ? (
        <NamedEntityForm
          title="Poste"
          submitLabel="Enregistrer"
          initial={{ name: row.name }}
          onCancel={() => router.push(`/designations/${id}`)}
          onSubmit={async (values) => {
            await updateDesignation(id, values)
            router.push(`/designations/${id}`)
          }}
        />
      ) : null}
    </div>
  )
}

