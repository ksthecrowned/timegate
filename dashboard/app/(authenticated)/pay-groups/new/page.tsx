'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import PayGroupForm from '@/components/timegate/PayGroupForm'
import { createPayGroup } from '@/lib/timegate/pay-groups'

export default function NewPayGroupPage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Groupes de paie', href: '/pay-groups' },
          { label: 'Ajouter' },
        ]}
      />
      <PayGroupForm
        submitLabel="Créer"
        onCancel={() => router.push('/pay-groups')}
        onSubmit={async (values) => {
          await createPayGroup(values)
          router.push('/pay-groups')
        }}
      />
    </div>
  )
}
