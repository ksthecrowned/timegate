'use client'

import { useState } from 'react'
import type { Employee } from '@/lib/timegate/types'
import { ensureEmployeePortalUser } from '@/lib/timegate/trusted-devices'
import { HttpError } from '@/lib/http'
import { primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'

type Props = {
  employee: Employee
  onUpdated: () => void
  bare?: boolean
}

export default function EmployeePortalAccessCard({
  employee,
  onUpdated,
  bare = false,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const hasPortalUser = Boolean(employee.linkedUser ?? employee.userId)

  async function handleCreate() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await ensureEmployeePortalUser(employee.id)
      if (res.created) {
        setMessage(
          `Accès créé pour ${res.email}. L’employé pourra se connecter via OTP (sans mot de passe initial).`,
        )
      } else if (!res.hasPassword) {
        setMessage(
          `Compte existant (${res.email}) — en attente de première connexion OTP.`,
        )
      } else {
        setMessage(`Compte existant (${res.email}) — mot de passe déjà configuré.`)
      }
      onUpdated()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Impossible de créer l’accès.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={
        bare
          ? 'flex flex-col gap-4 rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-border-dark dark:bg-white/3'
          : 'tg-card space-y-4 p-6 shadow-2xs'
      }
    >
      <div>
        <h3
          className={
            bare
              ? 'text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100'
              : 'text-lg font-semibold text-gray-900 dark:text-white'
          }
        >
          Accès application employé
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
          Compte de connexion à l’app mobile TimeGate (e-mail personnel de l’employé).
        </p>
      </div>

      {employee.linkedUser ? (
        <p className="text-sm text-gray-700 dark:text-neutral-300">
          Compte lié :{' '}
          <span className="font-medium">{employee.linkedUser.email}</span>
        </p>
      ) : hasPortalUser ? (
        <p className="text-sm text-gray-700 dark:text-neutral-300">
          Compte utilisateur lié (rechargez si l’e-mail n’apparaît pas).
        </p>
      ) : (
        <p className="text-sm text-gray-500">
          Aucun compte — l’employé ne peut pas se connecter à l’application.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}

      {!hasPortalUser && (
        <button
          type="button"
          className={primaryBtnClass}
          disabled={loading || !employee.email}
          onClick={() => void handleCreate()}
        >
          {loading ? 'Création…' : 'Créer accès app employé'}
        </button>
      )}

      {hasPortalUser && !employee.email && (
        <p className="text-xs text-amber-600">
          Ajoutez un e-mail personnel à la fiche employé pour permettre la connexion.
        </p>
      )}

      {hasPortalUser && (
        <button type="button" className={secondaryBtnClass} disabled={loading} onClick={() => void handleCreate()}>
          {loading ? 'Vérification…' : 'Vérifier / lier le compte'}
        </button>
      )}
    </div>
  )
}
