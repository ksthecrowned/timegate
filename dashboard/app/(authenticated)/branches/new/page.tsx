'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import BranchForm from '@/components/timegate/BranchForm'
import { createBranch } from '@/lib/timegate/branches'
import { primaryBtnClass } from '@/components/timegate/ui'

export default function NewBranchPage() {
  const router = useRouter()

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Branches', href: '/branches' }, { label: 'Ajouter' }]}
        action={
          <Link href="/branches" className={primaryBtnClass}>
            Retour à la liste
          </Link>
        }
      />
      <BranchForm
        submitLabel="Créer la branche"
        onCancel={() => router.push('/branches')}
        onSubmit={async (values) => {
          const branch = await createBranch(values)
          router.push(`/branches/${branch.id}`)
        }}
      />
    </div>
  )
}
