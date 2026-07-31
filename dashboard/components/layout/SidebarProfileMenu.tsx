'use client'

import { useSubscriptionAccess } from '@/components/providers/SubscriptionAccessProvider'
import { useClickOutside } from '@/lib/hooks/use-click-outside'
import {
  planLabel,
  subscriptionStatusShortLabel,
  upgradeTargetPlan,
} from '@/lib/subscription-ui'
import { getRoleLabel } from '@/lib/timegate/roles'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useCallback, useRef, useState } from 'react'

function daysLeftLabel(days: number | null | undefined): string | null {
  if (days == null) return null
  if (days < 0) return null
  if (days === 0) return "Expire aujourd'hui"
  return `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`
}

function graceDaysLabel(days: number | null | undefined): string | null {
  if (days == null) return null
  if (days < 0) return 'Grâce échue'
  if (days === 0) return 'Grâce jusqu’à aujourd’hui'
  return `${days} j de grâce restant${days > 1 ? 's' : ''}`
}

export default function SidebarProfileMenu() {
  const { data: session } = useSession()
  const { status, loading } = useSubscriptionAccess()
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(menuRef, open, close)

  const email = session?.user?.email ?? 'admin@timegate.com'
  const displayName =
    [session?.user?.firstName, session?.user?.lastName].filter(Boolean).join(' ') ||
    email.split('@')[0]
  const roleLabel = getRoleLabel(session?.user?.role)
  const isAdmin = session?.user?.role === 'ADMIN'

  const handleLogout = () => {
    void signOut({ callbackUrl: '/login' })
  }

  const sub = status?.subscription
  const plan = sub?.plan
  const isTrial = status?.status === 'TRIAL'
  const isActive = status?.status === 'ACTIVE'
  const isGrace = status?.status === 'GRACE_READ_ONLY'
  const upgradeTarget = upgradeTargetPlan(plan)
  const needsActivation = Boolean(status?.readOnly || status?.blocked || isTrial)
  const statusShort = status?.status ? subscriptionStatusShortLabel(status.status) : null
  const planName =
    status?.status === 'GRACE_READ_ONLY'
      ? 'Période de grâce'
      : status?.status === 'BLOCKED'
        ? 'Abonnement expiré'
        : planLabel(plan)
  const usageLine = sub?.usage
    ? `${sub.usage.employees}/${sub.usage.maxEmployees} emp. · ${sub.usage.kiosks}/${sub.usage.maxKiosks} kiosks`
    : null
  const countdown = isGrace
    ? graceDaysLabel(sub?.daysUntilGraceEnd)
    : daysLeftLabel(sub?.daysUntilExpiry)
  const showDays = Boolean(
    countdown && (isTrial || isGrace || isActive || status?.blocked),
  )
  const activateLabel =
    isTrial && upgradeTarget ? `Passer au ${upgradeTarget}` : 'Activer une clé'

  const badgeTone = status?.blocked
    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    : status?.readOnly
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
      : isTrial
        ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'

  return (
    <div ref={menuRef} className="relative" data-tour="sidebar-profile">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-surface-card px-2.5 py-2 text-left hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-border-dark dark:bg-surface-card-dark dark:hover:bg-primary/10"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu profil"
      >
        <img
          className="size-9 shrink-0 rounded-full object-cover object-center"
          src="/images/users/avatar-man.jpg"
          alt=""
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
            {displayName}
          </span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
            {roleLabel}
          </span>
        </span>
        <svg
          className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          className="absolute bottom-full left-0 right-0 z-30 mb-2 min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-surface-card shadow-lg dark:border-border-dark dark:bg-surface-card-dark"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="border-b border-slate-200/80 px-3 py-3 dark:border-border-dark">
            <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabel}</p>
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {email}
            </p>
          </div>

          <div className="border-b border-slate-200/80 p-3 dark:border-border-dark">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Abonnement
            </p>
            {loading ? (
              <div className="space-y-2">
                <div className="h-3.5 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : sub ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{planName}</p>
                  {statusShort && !(isTrial && plan?.toUpperCase() === 'TRIAL') ? (
                    <span
                      className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeTone}`}
                    >
                      {statusShort}
                    </span>
                  ) : null}
                </div>
                {usageLine ? (
                  <p className="text-xs leading-snug text-slate-600 dark:text-slate-300">
                    {usageLine}
                  </p>
                ) : null}
                {showDays ? (
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {countdown}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  {isAdmin ? (
                    <Link
                      href="/subscriptions"
                      onClick={close}
                      className="text-xs font-medium text-primary hover:underline"
                      role="menuitem"
                    >
                      Détails
                    </Link>
                  ) : null}
                  {isAdmin && needsActivation ? (
                    <Link
                      href="/activate"
                      onClick={close}
                      className="text-xs font-semibold text-primary hover:underline"
                      role="menuitem"
                    >
                      {activateLabel}
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">Aucun abonnement</p>
            )}
          </div>

          <div className="p-1 space-y-0.5">
            <Link
              href="/profile"
              onClick={close}
              className="flex items-center gap-x-3.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-primary/10 hover:text-primary focus:outline-none dark:text-slate-200 dark:hover:bg-primary/15 dark:hover:text-accent"
              role="menuitem"
            >
              <i className="fa-solid fa-id-card-clip shrink-0 size-4" />
              Profil
            </Link>
            <button
              type="button"
              onClick={() => {
                close()
                handleLogout()
              }}
              className="flex w-full items-center gap-x-3.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none dark:text-red-400 dark:hover:bg-red-950/40"
              role="menuitem"
            >
              <i className="fa-solid fa-power-off shrink-0 size-4" />
              Déconnexion
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
