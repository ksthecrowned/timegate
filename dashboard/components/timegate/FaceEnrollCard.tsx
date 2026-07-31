'use client'

import { useState } from 'react'
import FileUpload from '@/components/ui/FileUpload'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatApiDate } from '@/lib/date-utils'
import { addFaceSample, enrollFace } from '@/lib/timegate/face'
import { ApiErrorBanner, FormCard } from '@/components/timegate/ui'
import { HttpError } from '@/lib/http'

type FaceEnrollContentProps = {
  employeeId: string
  hasFaceEmbedding?: boolean
  faceEnrolledAt?: string | null
  onSuccess?: () => void
}

export function FaceEnrollContent({
  employeeId,
  hasFaceEmbedding,
  faceEnrolledAt,
  onSuccess,
}: FaceEnrollContentProps) {
  const [uploadKey, setUploadKey] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={hasFaceEmbedding ? 'Enrolé' : 'Non enrolé'} />
        {hasFaceEmbedding && faceEnrolledAt ? (
          <span className="text-xs text-gray-500 dark:text-neutral-400">
            Depuis le {formatApiDate(faceEnrolledAt)}
          </span>
        ) : null}
      </div>
      <p className="mb-4 text-sm text-gray-600 dark:text-neutral-400">
        {hasFaceEmbedding
          ? 'Ajoutez un nouvel échantillon pour améliorer la reconnaissance.'
          : 'Téléversez une photo claire du visage pour activer le pointage au kiosque.'}
      </p>
      <ApiErrorBanner message={error} />
      {success && (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-700 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-400">
          {success}
        </div>
      )}
      <FileUpload
        key={uploadKey}
        accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }}
        hint="Photo claire du visage — glissez-déposez ou parcourez (JPEG, PNG, WebP)."
        uploadHandler={async (file, onProgress) => {
          setError('')
          setSuccess('')
          onProgress(25)
          try {
            const fn = hasFaceEmbedding ? addFaceSample : enrollFace
            await fn(employeeId, file)
            onProgress(100)
            setSuccess(
              hasFaceEmbedding ? 'Échantillon facial ajouté.' : 'Visage enregistré avec succès.',
            )
            onSuccess?.()
            setUploadKey((k) => k + 1)
          } catch (err) {
            throw err instanceof HttpError ? err : new Error('Enregistrement impossible.')
          }
        }}
      />
    </div>
  )
}

type FaceEnrollCardProps = FaceEnrollContentProps & { bare?: boolean }

export default function FaceEnrollCard({ bare, ...props }: FaceEnrollCardProps) {
  return (
    <FormCard title="Reconnaissance faciale" bare={bare}>
      <FaceEnrollContent {...props} />
    </FormCard>
  )
}
