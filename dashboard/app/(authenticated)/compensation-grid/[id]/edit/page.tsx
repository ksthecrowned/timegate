'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import CompensationGridForm from '@/components/timegate/CompensationGridForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getCompensationGrid, updateCompensationGrid } from '@/lib/timegate/compensation-grid'
import type { CompensationGridEntry } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EditCompensationGridPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [row, setRow] = useState<CompensationGridEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getCompensationGrid(params.id)
      .then((found) => {
        if (!found) setError('Entrée introuvable.')
        else setRow(found)
      })
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [params.id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Grille de rémunération', href: '/compensation-grid' },
          { label: 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <CompensationGridForm
          submitLabel="Enregistrer"
          initial={{
            designationId: row.designationId,
            employmentTypeId: row.employmentTypeId,
            baseSalary: row.baseSalary,
            effectiveFrom: row.effectiveFrom,
            effectiveTo: row.effectiveTo ?? undefined,
          }}
          onCancel={() => router.push('/compensation-grid')}
          onSubmit={async (values) => {
            await updateCompensationGrid(params.id, values)
            router.push('/compensation-grid')
          }}
        />
      ) : null}
    </div>
  )
}
