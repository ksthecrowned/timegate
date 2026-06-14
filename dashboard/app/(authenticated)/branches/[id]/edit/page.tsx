'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import BranchForm from '@/components/timegate/BranchForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getBranch, updateBranch } from '@/lib/timegate/branches'
import type { Branch } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EditBranchPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        setBranch(await getBranch(id))
      } catch (err) {
        setError(err instanceof HttpError ? err.message : 'Branche introuvable.')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Branches', href: '/branches' },
          { label: branch?.name ?? 'Branche', href: `/branches/${id}` },
          { label: 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : branch ? (
        <BranchForm
          submitLabel="Enregistrer"
          onCancel={() => router.push(`/branches/${id}`)}
          initial={{
            name: branch.name,
            address: branch.address ?? '',
            timezone: branch.timezone ?? '',
          }}
          onSubmit={async (values) => {
            await updateBranch(id, values)
            router.push(`/branches/${id}`)
          }}
        />
      ) : null}
    </div>
  )
}
