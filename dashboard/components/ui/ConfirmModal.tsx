'use client'
import { useEffect } from 'react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ open, title, message, confirmLabel = 'Oui', cancelLabel = 'Non', danger = true, onConfirm, onCancel }: ConfirmModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-80 flex h-screen items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80" onClick={onCancel} />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-xl border border-slate-200/80 bg-surface-card shadow-lg dark:border-border-dark dark:bg-surface-card-dark">
        <div className="w-full p-4 sm:p-7">
          <div className="w-full text-center">
            {/* Icon */}
            <span className={`mb-4 inline-flex justify-center items-center size-[62px] rounded-full border-4 ${danger ? 'border-red-50 bg-red-100 text-red-600 dark:bg-red-700 dark:border-red-600 dark:text-red-100' : 'border-yellow-50 bg-yellow-100 text-yellow-600'}`}>
              <svg className="shrink-0 size-5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
              </svg>
            </span>

            <h3 className="mb-2 text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            <p
              className="px-1 text-sm leading-relaxed text-slate-500 whitespace-break-spaces dark:text-slate-400"
            >
              {message}
            </p>
          </div>

          <div className="mt-6 flex justify-center gap-x-4">
            <button type="button" onClick={onCancel}
              className="inline-flex items-center gap-x-2 rounded-lg border border-slate-200/80 bg-surface-card px-3 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-primary/10 hover:text-primary dark:border-border-dark dark:bg-surface-elevated-dark dark:text-slate-200 dark:hover:bg-primary/15 dark:hover:text-teal-300">
              {cancelLabel}
            </button>
            <button type="button" onClick={onConfirm}
              className={`py-2 px-3 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent text-white ${danger ? 'bg-red-500 hover:bg-red-600 focus:bg-red-600' : 'bg-primary hover:bg-secondary'}`}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
