'use client'
import { useSubscriptionAccess } from '@/components/providers/SubscriptionAccessProvider'
import { REVIEW_STATUS } from '@/constants'
import { Tooltip } from '@/components/ui/HintTooltip'
import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
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

const dangerBtnClass =
  'py-2.5 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-slate-200/80 bg-surface-card text-red-700 shadow-xs hover:bg-red-50 focus:outline-none disabled:opacity-50 disabled:pointer-events-none dark:bg-surface-elevated-dark dark:border-border-dark dark:text-red-400 dark:hover:bg-red-900/30'

const menuItemClass =
  'flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-primary/10 hover:text-primary focus:outline-none focus:bg-primary/10 dark:text-slate-200 dark:hover:bg-primary/15 dark:hover:text-teal-300'

const menuDangerClass =
  'flex w-full items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-red-700 hover:bg-red-50 focus:outline-none dark:text-red-400 dark:hover:bg-red-900/30'

type MenuAction = {
  key: string
  label: string
  icon: string
  danger?: boolean
  href?: string
  onClick?: () => void
}

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

  const menuActions: MenuAction[] = []
  if (mailTo) {
    menuActions.push({
      key: 'mail',
      label: 'Envoyer un mail',
      icon: 'fa-solid fa-envelope-open-text',
      href: `mailto:${mailTo}`,
    })
  }
  if (writeEditHref) {
    menuActions.push({
      key: 'edit',
      label: 'Modifier',
      icon: 'fa-regular fa-pen-to-square',
      href: writeEditHref,
    })
  }
  if (writeOnToggle !== undefined) {
    menuActions.push({
      key: 'toggle',
      label: isActive ? 'Désactiver' : 'Activer',
      icon: isActive ? 'fa-solid fa-ban' : 'fa-regular fa-circle-check',
      onClick: () => {
        setConfirmType('toggle')
        setOpen(true)
      },
    })
  }
  writeExtra?.forEach((item, i) => {
    menuActions.push({
      key: `extra-${i}`,
      label: item.label,
      icon: item.faIcon ?? 'fa-solid fa-ellipsis',
      danger: item.danger,
      onClick: item.onClick,
    })
  })
  if (writeOnDelete) {
    menuActions.push({
      key: 'delete',
      label: 'Supprimer',
      icon: 'fa-regular fa-trash-can',
      danger: true,
      onClick: () => {
        setConfirmType('delete')
        setOpen(true)
      },
    })
  }

  const reviewCount = writeReviewActions?.length ?? 0
  const totalActions = (viewHref ? 1 : 0) + reviewCount + menuActions.length
  const useInlineIcons = totalActions > 0 && totalActions < 3

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

  function renderIconAction(action: MenuAction): ReactNode {
    const className = action.danger ? dangerBtnClass : btnClass
    if (action.href) {
      const isMailto = action.href.startsWith('mailto:')
      if (isMailto) {
        return (
          <Tooltip key={action.key} content={action.label}>
            <a href={action.href} className={className} aria-label={action.label}>
              <i className={action.icon} />
            </a>
          </Tooltip>
        )
      }
      return (
        <Tooltip key={action.key} content={action.label}>
          <Link href={action.href} className={className} aria-label={action.label}>
            <i className={action.icon} />
          </Link>
        </Tooltip>
      )
    }
    return (
      <Tooltip key={action.key} content={action.label}>
        <button
          type="button"
          onClick={action.onClick}
          className={className}
          aria-label={action.label}
        >
          <i className={action.icon} />
        </button>
      </Tooltip>
    )
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
          <Tooltip content="Voir plus">
            <Link href={viewHref} className={btnClass} aria-label="Voir plus">
              <i className="fa-regular fa-eye" />
            </Link>
          </Tooltip>
        )}

        {writeReviewActions?.map((item, i) => {
          const reviewBtn = (
            <button
              type="button"
              onClick={() => {
                setConfirmType('review')
                setActiveReviewStatus(item.actionStatus)
                setOpen(true)
                closeMenu()
              }}
              className={
                useInlineIcons
                  ? btnClass
                  : 'flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm ' + item.cls
              }
              aria-label={item.label}
            >
              {useInlineIcons ? (
                <i
                  className={
                    item.actionStatus === 'APPROVED'
                      ? 'fa-regular fa-circle-check'
                      : 'fa-regular fa-circle-xmark'
                  }
                />
              ) : (
                item.label
              )}
            </button>
          )
          return useInlineIcons ? (
            <Tooltip key={i} content={item.label}>
              {reviewBtn}
            </Tooltip>
          ) : (
            <span key={i}>{reviewBtn}</span>
          )
        })}

        {useInlineIcons
          ? menuActions.map(renderIconAction)
          : menuActions.length > 0 && (
              <div ref={menuRef} className="relative inline-flex">
                <Tooltip content="Autres options">
                  <button
                    type="button"
                    className={btnClass}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label="Autres options"
                    onClick={() => setMenuOpen((o) => !o)}
                  >
                    <i className="fa-solid fa-ellipsis-vertical" />
                  </button>
                </Tooltip>

                {menuOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 min-w-10 divide-y divide-slate-200/80 rounded-lg border border-slate-200/80 bg-surface-card shadow-lg dark:divide-border-dark dark:border-border-dark dark:bg-surface-card-dark"
                    role="menu"
                  >
                    <div className="p-1 space-y-0.5">
                      {menuActions
                        .filter((a) => a.key !== 'delete')
                        .map((action) =>
                          action.href ? (
                            action.href.startsWith('mailto:') ? (
                              <a
                                key={action.key}
                                href={action.href}
                                onClick={closeMenu}
                                className={action.danger ? menuDangerClass : menuItemClass}
                                role="menuitem"
                              >
                                <i className={`${action.icon} shrink-0 size-4`} /> {action.label}
                              </a>
                            ) : (
                              <Link
                                key={action.key}
                                href={action.href}
                                onClick={closeMenu}
                                className={action.danger ? menuDangerClass : menuItemClass}
                                role="menuitem"
                              >
                                <i className={`${action.icon} shrink-0 size-4`} /> {action.label}
                              </Link>
                            )
                          ) : (
                            <button
                              key={action.key}
                              type="button"
                              onClick={() => {
                                action.onClick?.()
                                closeMenu()
                              }}
                              className={
                                action.danger
                                  ? menuDangerClass
                                  : `${menuItemClass} w-full`
                              }
                              role="menuitem"
                            >
                              <i className={`${action.icon} shrink-0 size-4`} /> {action.label}
                            </button>
                          ),
                        )}
                    </div>
                    {menuActions.some((a) => a.key === 'delete') && (
                      <div className="p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmType('delete')
                            setOpen(true)
                            closeMenu()
                          }}
                          className={menuDangerClass}
                          role="menuitem"
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
