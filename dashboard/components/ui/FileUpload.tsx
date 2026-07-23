'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useDropzone, type Accept } from 'react-dropzone'

const DEFAULT_HINT =
  '1 image est attendue à ce niveau. Seule la première image sera prise en charge.'

export type FileUploadItem = {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'done' | 'error'
  previewUrl?: string
  error?: string
}

export type UploadHandler = (
  file: File,
  onProgress: (percent: number) => void,
) => Promise<void>

export interface FileUploadProps {
  onFiles?: (files: File[]) => void
  /** Handler d'upload réel (API). Sans handler, progression simulée. */
  uploadHandler?: UploadHandler
  hint?: string
  accept?: Accept
  maxFiles?: number
  className?: string
  disabled?: boolean
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/** Upload simulé en attendant le branchement API. */
async function simulateUpload(_file: File, onProgress: (percent: number) => void): Promise<void> {
  const milestones = [8, 22, 38, 55, 72, 88, 100]
  for (const p of milestones) {
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 90))
    onProgress(p)
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export default function FileUpload({
  onFiles,
  uploadHandler,
  hint = DEFAULT_HINT,
  accept = { 'image/*': [] },
  maxFiles = 1,
  className = '',
  disabled = false,
}: FileUploadProps) {
  const baseId = useId()
  const itemsRef = useRef<FileUploadItem[]>([])
  const [items, setItems] = useState<FileUploadItem[]>([])

  itemsRef.current = items

  const revokePreview = useCallback((item: FileUploadItem) => {
    if (item.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(item.previewUrl)
    }
  }, [])

  useEffect(() => {
    return () => {
      itemsRef.current.forEach(revokePreview)
    }
  }, [revokePreview])

  const notifyParent = useCallback(
    (nextItems: FileUploadItem[]) => {
      const done = nextItems.filter((i) => i.status === 'done').map((i) => i.file)
      onFiles?.(done)
    },
    [onFiles],
  )

  const runUpload = useCallback(
    async (itemId: string, file: File) => {
      const upload = uploadHandler ?? simulateUpload
      try {
        await upload(file, (percent) => {
          setItems((prev) =>
            prev.map((i) => (i.id === itemId ? { ...i, progress: percent } : i)),
          )
        })
        setItems((prev) => {
          const next = prev.map((i) =>
            i.id === itemId ? { ...i, progress: 100, status: 'done' as const } : i,
          )
          notifyParent(next)
          return next
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Échec de l'envoi"
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, status: 'error', error: message } : i)),
        )
      }
    },
    [uploadHandler, notifyParent],
  )

  const addFiles = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length || disabled) return

      const current = itemsRef.current
      const remaining = maxFiles === 1 ? 1 : maxFiles - current.filter((i) => i.status !== 'error').length
      const toAdd = accepted.slice(0, Math.max(remaining, 0))
      if (!toAdd.length) return

      if (maxFiles === 1) current.forEach(revokePreview)

      const newItems: FileUploadItem[] = toAdd.map((file, index) => ({
        id: `${baseId}-${Date.now()}-${index}`,
        file,
        progress: 0,
        status: 'uploading' as const,
        previewUrl: isImageFile(file) ? URL.createObjectURL(file) : undefined,
      }))

      const next = maxFiles === 1 ? newItems : [...current, ...newItems]
      setItems(next)

      for (const item of newItems) {
        await runUpload(item.id, item.file)
      }
    },
    [baseId, disabled, maxFiles, revokePreview, runUpload],
  )

  const removeItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const target = prev.find((i) => i.id === id)
        if (target) revokePreview(target)
        const next = prev.filter((i) => i.id !== id)
        notifyParent(next)
        return next
      })
    },
    [notifyParent, revokePreview],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => void addFiles(files),
    accept,
    maxFiles,
    disabled: disabled || (maxFiles > 1 && items.length >= maxFiles),
  })

  const atCapacity = maxFiles > 1 && items.length >= maxFiles

  return (
    <div className={`space-y-4 ${className}`}>
      {!atCapacity && (
        <div
          {...getRootProps()}
          className={`cursor-pointer p-8 sm:p-12 flex justify-center bg-surface-card border border-dashed border-slate-300 rounded-xl transition-colors dark:bg-surface-card-dark dark:border-border-dark ${
            isDragActive ? 'border-primary bg-primary/5 dark:bg-primary/10' : ''
          } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
          data-hs-file-upload-trigger=""
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <span className="inline-flex justify-center items-center size-16 bg-slate-100 text-slate-800 rounded-full dark:bg-surface-elevated-dark dark:text-slate-200">
              <svg
                className="shrink-0 size-6"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
            </span>

            <div className="mt-4 flex flex-wrap justify-center text-sm leading-6 text-gray-600 dark:text-neutral-400">
              <span className="pe-1 font-medium text-gray-800 dark:text-neutral-200">
                {isDragActive ? 'Déposez ici...' : 'Déposez votre fichier ici ou'}
              </span>
              <span className="font-semibold text-primary hover:text-secondary decoration-2 hover:underline">
                parcourir
              </span>
            </div>

            {hint ? <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500">{hint}</p> : null}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div
          className={`grid gap-3 ${maxFiles === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}
        >
          {items.map((item) => (
            <FilePreviewCard key={item.id} item={item} onRemove={() => removeItem(item.id)} disabled={disabled} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilePreviewCard({
  item,
  onRemove,
  disabled,
}: {
  item: FileUploadItem
  onRemove: () => void
  disabled?: boolean
}) {
  const { file, previewUrl, progress, status, error } = item
  const isImage = isImageFile(file)

  return (
    <div className="relative group rounded-xl border border-slate-200/80 overflow-hidden bg-white dark:bg-surface-card-dark dark:border-border-dark">
      <div className="relative aspect-[4/3] bg-slate-50 dark:bg-surface-elevated-dark flex items-center justify-center">
        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className={`w-full h-full object-cover transition-opacity ${
              status === 'uploading' ? 'opacity-60' : 'opacity-100'
            }`}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <span className="inline-flex justify-center items-center size-12 rounded-full bg-slate-100 dark:bg-surface-elevated-dark text-gray-500">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </span>
            <span className="text-xs text-gray-600 dark:text-neutral-400 line-clamp-2 break-all">{file.name}</span>
          </div>
        )}

        {status === 'uploading' && (
          <div className="absolute inset-0 flex flex-col justify-end bg-black/45 p-3">
            <div className="flex items-center justify-between text-xs text-white mb-1.5">
              <span>Envoi en cours...</span>
              <span className="font-semibold tabular-nums">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/70 p-3 text-center">
            <span className="text-xs font-medium text-red-100">{error ?? 'Erreur'}</span>
          </div>
        )}

        {status === 'done' && (
          <span className="absolute top-2 start-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/90 text-white">
            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Terminé
          </span>
        )}
      </div>

      <div className="px-2.5 py-2 border-t border-slate-100 dark:border-border-dark flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-800 dark:text-neutral-200 truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-neutral-500">{formatSize(file.size)}</p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 size-7 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            aria-label="Supprimer le fichier"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
