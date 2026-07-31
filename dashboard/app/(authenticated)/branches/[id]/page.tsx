'use client'

import { formatApiDateTime } from '@/lib/date-utils'
import WriteLink from '@/components/timegate/WriteLink'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import ResourceDetailSection from '@/components/timegate/ResourceDetailSection'
import ResourceProfileHeader from '@/components/timegate/ResourceProfileHeader'
import { ApiErrorBanner, primaryBtnClass } from '@/components/timegate/ui'
import { deleteBranch, getBranch } from '@/lib/timegate/branches'
import type { Branch } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function BranchDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setBranch(await getBranch(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Branche introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Branches', href: '/branches' },
          { label: branch?.name ?? 'Détail' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : branch ? (
        <div className="space-y-6">
          <ResourceProfileHeader
            title={branch.name}
            subtitle={branch.branchCode ?? undefined}
            meta={[branch.city?.name, branch.country?.name].filter(Boolean).join(', ') || undefined}
            initials={branch.name.slice(0, 2).toUpperCase()}
            isActive={branch.isActive ?? true}
          >
            <div className="flex gap-2 pb-1">
              <WriteLink href={`/branches/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </WriteLink>
              <ActionButtons
                onDelete={async () => {
                  await deleteBranch(id)
                  router.push('/branches')
                }}
                deleteMessage="Cette branche sera définitivement supprimée."
              />
            </div>
          </ResourceProfileHeader>

          <div className="grid gap-6 lg:grid-cols-2">
            <ResourceDetailSection
              title="Localisation"
              items={[
                { label: 'Adresse', value: branch.address },
                { label: 'Ville', value: branch.city?.name },
                { label: 'Pays', value: branch.country?.name },
                { label: 'Latitude', value: branch.latitude },
                { label: 'Longitude', value: branch.longitude },
                { label: 'Rayon pointage (m)', value: branch.checkinRadius },
                { label: 'Fuseau horaire', value: branch.timezone },
              ]}
            />
            <ResourceDetailSection
              title="Contact & statut"
              items={[
                { label: 'Téléphone', value: branch.phone },
                { label: 'Email', value: branch.email },
                { label: 'Siège social', value: branch.isHeadOffice ? 'Oui' : 'Non' },
                {
                  label: 'Créée le',
                  value: formatApiDateTime(branch.createdAt),
                },
              ]}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
