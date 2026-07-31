'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import PayGroupForm from '@/components/timegate/PayGroupForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getPayGroup, updatePayGroup } from '@/lib/timegate/pay-groups'
import type { PayGroup } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EditPayGroupPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [row, setRow] = useState<PayGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getPayGroup(params.id)
      .then((found) => {
        if (!found) setError('Groupe introuvable.')
        else setRow(found)
      })
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [params.id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Groupes de paie', href: '/pay-groups' },
          { label: 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <PayGroupForm
          submitLabel="Enregistrer"
          initial={{
            name: row.name,
            payDayOfMonth: row.payDayOfMonth,
            isDefault: row.isDefault,
          }}
          onCancel={() => router.push('/pay-groups')}
          onSubmit={async (values) => {
            await updatePayGroup(params.id, values)
            router.push('/pay-groups')
          }}
        />
      ) : null}
    </div>
  )
}
