'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import { FormField, Input } from '@/components/ui/FormField'
import {
  ApiErrorBanner,
  FormCard,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/timegate/ui'
import { HttpError } from '@/lib/http'
import { createClientMission } from '@/lib/timegate/client-missions'

export default function NewClientMissionPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [clientLabel, setClientLabel] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const mission = await createClientMission({
        title: title.trim(),
        clientLabel: clientLabel.trim() || title.trim(),
        address: address.trim() || undefined,
        status: 'ACTIVE',
      })
      router.push(`/client-missions/${mission.id}`)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Création impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Missions client', href: '/client-missions' },
          { label: 'Nouvelle' },
        ]}
        action={
          <Link href="/client-missions" className={secondaryBtnClass}>
            Retour
          </Link>
        }
      />

      {error && <ApiErrorBanner message={error} />}

      <FormCard title="Mission / page QR client">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Titre mission" required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ex. Nettoyage nuit — ACME"
            />
          </FormField>
          <FormField label="Libellé client / site">
            <Input
              value={clientLabel}
              onChange={(e) => setClientLabel(e.target.value)}
              placeholder="Défaut = titre"
            />
          </FormField>
          <FormField label="Adresse (optionnel)">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </FormField>
          <p className="text-xs text-slate-500">
            Crée un lieu client, un kiosk QR virtuel et un lien public rotatif.
          </p>
          <div className="flex justify-end">
            <button type="submit" disabled={loading} className={primaryBtnClass}>
              {loading ? 'Création…' : 'Créer et activer'}
            </button>
          </div>
        </form>
      </FormCard>
    </div>
  )
}
