'use client'

import { useSubscriptionAccess } from '@/components/providers/SubscriptionAccessProvider'
import Link from 'next/link'

const addBtnClass =
  'py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-primary text-white hover:bg-secondary focus:outline-none disabled:opacity-50 disabled:pointer-events-none'

export default function AddPageLink({
  href,
  label = 'Ajouter',
  tourAction,
}: {
  href: string
  label?: string
  tourAction?: string
}) {
  const { canWrite } = useSubscriptionAccess()

  if (!canWrite) {
    return (
      <button
        type="button"
        disabled
        className={addBtnClass}
        title="Lecture seule — activez une clé pour ajouter"
        data-tour-action={tourAction}
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {label}
      </button>
    )
  }

  return (
    <Link href={href} className={addBtnClass} data-tour-action={tourAction}>
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      {label}
    </Link>
  )
}
