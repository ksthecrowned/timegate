'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import CountryForm from '@/components/timegate/CountryForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getCountry, updateCountry } from '@/lib/timegate/countries'
import type { Country } from '@/lib/timegate/countries'
import { HttpError } from '@/lib/http'

export default function EditCountryPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<Country | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getCountry(id)
      .then(setRow)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Pays introuvable.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Plateforme' },
          { label: 'Pays', href: '/countries' },
          { label: row?.name ?? 'Pays', href: `/countries/${id}` },
          { label: 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <CountryForm
          initial={{
            name: row.name,
            isoCode: row.isoCode,
            phoneCode: row.phoneCode ?? undefined,
          }}
          submitLabel="Enregistrer"
          onCancel={() => router.push(`/countries/${id}`)}
          onSubmit={async (values) => {
            await updateCountry(id, values)
            router.push(`/countries/${id}`)
          }}
        />
      ) : null}
    </div>
  )
}
