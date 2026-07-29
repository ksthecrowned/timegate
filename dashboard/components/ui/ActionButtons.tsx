'use client'
import { useSubscriptionAccess } from '@/components/providers/SubscriptionAccessProvider'
import { REVIEW_STATUS } from '@/constants'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import ConfirmModal from './ConfirmModal'

interface Extra {
  label: string
  faIcon?: string
  onClick: () => void
  danger?: boolean
}

interface ActionButtonsProps {
  viewHref?: string
  editHref?: string
  onDelete?: () => void
  handleReview?: (status: REVIEW_STATUS) => void
  reviewActions?: {
    cls: string
    actionStatus: REVIEW_STATUS
    label: string
  }[]
  onToggleStatus?: () => void
  isActive?: boolean
  mailTo?: string
  extra?: Extra[]
  deleteMessage?: string
  toggleMessage?: string
}

const btnClass =
  'py-2.5 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-slate-200/80 bg-surface-card text-slate-700 shadow-xs hover:bg-primary/10 hover:text-primary focus:outline-none focus:bg-primary/10 disabled:opacity-50 disabled:pointer-events-none dark:bg-surface-elevated-dark dark:border-border-dark dark:text-slate-200 dark:hover:bg-primary/15 dark:hover:text-teal-300'

export default function ActionButtons({
  viewHref,
  editHref,
  onDelete,
  handleReview,
  reviewActions,
  onToggleStatus,
  isActive,
  mailTo,
  extra,
  deleteMessage,
  toggleMessage,
}: ActionButtonsProps) {
  const { canWrite } = useSubscriptionAccess()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmType, setConfirmType] = useState<'delete' | 'toggle' | 'review'>('delete')
  const [activeReviewStatus, setActiveReviewStatus] = useState<REVIEW_STATUS>('REJECTED')
  const menuRef = useRef<HTMLDivElement>(null)

  const writeEditHref = canWrite ? editHref : undefined
  const writeOnDelete = canWrite ? onDelete : undefined
  const writeOnToggle = canWrite ? onToggleStatus : undefined
  const writeReviewActions = canWrite ? reviewActions : undefined
  const writeHandleReview = canWrite ? handleReview : undefined
  const writeExtra = canWrite ? extra : undefined

  const hasDropdown =
    Boolean(writeEditHref) ||
    Boolean(writeOnDelete) ||
    writeOnToggle !== undefined ||
    Boolean(mailTo) ||
    Boolean(writeExtra && writeExtra.length > 0)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <>
      <ConfirmModal
        open={open}
        title="Etes-vous sûr?"
        message={
          confirmType === 'delete'
            ? (deleteMessage ??
              'En supprimant cet élément, il sera définitivement retiré de votre liste.')
            : confirmType === 'review'
              ? activeReviewStatus === 'APPROVED'
                ? 'Souhaitez-vous vraiment approuver cette demande ?'
                : activeReviewStatus === 'REJECTED'
                  ? 'Souhaitez-vous vraiment rejeter cette demande ?'
                  : ''
              : (toggleMessage ??
                (isActive
                  ? "En désactivant ce compte, l'utilisateur ne pourra plus accéder à l'application."
                  : "En activant ce compte, l'utilisateur aura de nouveau accès à l'application."))
        }
        onConfirm={() => {
          setOpen(false)
          closeMenu()
          if (confirmType === 'delete') writeOnDelete?.()
          else if (confirmType === 'review') writeHandleReview?.(activeReviewStatus)
          else writeOnToggle?.()
        }}
        onCancel={() => setOpen(false)}
        danger={
          confirmType === 'delete' ||
          (confirmType === 'review' && activeReviewStatus === 'REJECTED')
        }
      />

      <div className="inline-flex gap-x-2">
        {viewHref && (
          <Link href={viewHref} className={btnClass} title="Voir plus">
            <i className="fa-regular fa-eye" />
          </Link>
        )}
        {writeReviewActions?.map((item, i) => (
          <div key={i} className="p-1">
            <button
              type="button"
              onClick={() => {
                setConfirmType('review')
                setActiveReviewStatus(item.actionStatus)
                setOpen(true)
                closeMenu()
              }}
              className={'flex w-full items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm ' + item.cls}
            >
              {item.label}
            </button>
          </div>
        ))}

        {hasDropdown && (
          <div ref={menuRef} className="relative inline-flex">
            <button
              type="button"
              className={btnClass}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Autres options"
              title="Autres options"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <i className="fa-solid fa-ellipsis-vertical" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 min-w-10 divide-y divide-slate-200/80 rounded-lg border border-slate-200/80 bg-surface-card shadow-lg dark:divide-border-dark dark:border-border-dark dark:bg-surface-card-dark"
                role="menu"
              >
                <div className="p-1 space-y-0.5">
                  {mailTo && (
                    <a
                      href={`mailto:${mailTo}`}
                      onClick={closeMenu}
                      className="flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-primary/10 hover:text-primary focus:outline-none focus:bg-primary/10 dark:text-slate-200 dark:hover:bg-primary/15 dark:hover:text-teal-300"
                    >
                      <i className="fa-solid fa-envelope-open-text shrink-0 size-4" /> Envoyer un
                      mail
                    </a>
                  )}
                  {writeEditHref && (
                    <Link
                      href={writeEditHref}
                      onClick={closeMenu}
                      className="flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-primary/10 hover:text-primary focus:outline-none focus:bg-primary/10 dark:text-slate-200 dark:hover:bg-primary/15 dark:hover:text-teal-300"
                    >
                      <i className="fa-regular fa-pen-to-square shrink-0 size-4" /> Modifier
                    </Link>
                  )}
                  {writeOnToggle !== undefined && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmType('toggle')
                        setOpen(true)
                        closeMenu()
                      }}
                      className="flex w-full items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-primary/10 hover:text-primary dark:text-slate-200 dark:hover:bg-primary/15 dark:hover:text-teal-300"
                    >
                      {isActive ? (
                        <>
                          <i className="fa-solid fa-ban shrink-0 size-4" /> Désactiver
                        </>
                      ) : (
                        <>
                          <i className="fa-regular fa-circle-check shrink-0 size-4" /> Activer
                        </>
                      )}
                    </button>
                  )}
                  {writeExtra?.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        item.onClick()
                        closeMenu()
                      }}
                      className={`flex w-full items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm ${item.danger ? 'text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30' : 'text-slate-700 hover:bg-primary/10 hover:text-primary dark:text-slate-200 dark:hover:bg-primary/15 dark:hover:text-teal-300'}`}
                    >
                      {item.faIcon && <i className={`${item.faIcon} shrink-0 size-4`} />}
                      {item.label}
                    </button>
                  ))}
                </div>
                {writeOnDelete && (
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmType('delete')
                        setOpen(true)
                        closeMenu()
                      }}
                      className="flex w-full items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-red-700 hover:bg-red-50 focus:outline-none dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      <i className="fa-regular fa-trash-can shrink-0 size-4" /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
