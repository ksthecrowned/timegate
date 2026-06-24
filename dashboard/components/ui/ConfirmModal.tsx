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
    <div className="fixed inset-0 z-80 flex items-center justify-center h-screen">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/50 dark:bg-neutral-900/80" onClick={onCancel} />

      {/* Modal */}
      <div className="relative z-10 bg-white border border-gray-200 rounded-xl shadow-lg dark:bg-neutral-800 dark:border-neutral-700 w-full max-w-lg mx-4">
        <div className="w-full p-4 sm:p-7">
          <div className="w-full text-center">
            {/* Icon */}
            <span className={`mb-4 inline-flex justify-center items-center size-[62px] rounded-full border-4 ${danger ? 'border-red-50 bg-red-100 text-red-600 dark:bg-red-700 dark:border-red-600 dark:text-red-100' : 'border-yellow-50 bg-yellow-100 text-yellow-600'}`}>
              <svg className="shrink-0 size-5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
              </svg>
            </span>

            <h3 className="mb-2 text-xl font-bold text-gray-800 dark:text-neutral-200">{title}</h3>
            <p
              className="text-gray-500 dark:text-neutral-400 text-sm leading-relaxed px-1 whitespace-break-spaces"
            >
              {message}
            </p>
          </div>

          <div className="mt-6 flex justify-center gap-x-4">
            <button type="button" onClick={onCancel}
              className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-xs hover:bg-gray-50 dark:bg-transparent dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
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
