'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import KioskForm from '@/components/timegate/KioskForm'
import { createKiosk } from '@/lib/timegate/kiosks'
import { primaryBtnClass } from '@/components/timegate/ui'

export default function NewKioskPage() {
  const router = useRouter()

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Kiosques', href: '/kiosks' }, { label: 'Ajouter' }]}
        action={
          <Link href="/kiosks" className={primaryBtnClass}>
            Retour à la liste
          </Link>
        }
      />
      <KioskForm
        submitLabel="Créer le kiosque"
        onCancel={() => router.push('/kiosks')}
        onSubmit={async (values) => {
          const kiosk = await createKiosk(values as { name: string; branchId: string; shiftLocationId?: string })
          router.push(`/kiosks/${kiosk.id}`)
        }}
      />
    </div>
  )
}
