'use client'

import { useState } from 'react'
import { FormField, Input } from '@/components/ui/FormField'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'

type NamedEntityFormProps = {
  title: string
  initial?: { name?: string }
  submitLabel: string
  onSubmit: (values: { name: string }) => Promise<void>
  onCancel?: () => void
}

export default function NamedEntityForm({
  title,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: NamedEntityFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({ name: name.trim() })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title={title}
        footer={
          <>
            {onCancel && (
              <button type="button" onClick={onCancel} className={secondaryBtnClass}>
                Annuler
              </button>
            )}
            <button type="submit" disabled={loading} className={primaryBtnClass}>
              {loading ? 'Enregistrement…' : submitLabel}
            </button>
          </>
        }
      >
        <ApiErrorBanner message={error} />
        <FormField label="Nom *">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
      </FormCard>
    </form>
  )
}
