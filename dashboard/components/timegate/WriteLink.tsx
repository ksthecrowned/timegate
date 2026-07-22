'use client'

import { useSubscriptionAccess } from '@/components/providers/SubscriptionAccessProvider'
import Link, { type LinkProps } from 'next/link'
import type { ReactNode } from 'react'

type WriteLinkProps = LinkProps & {
  className?: string
  children: ReactNode
  title?: string
}

/** Lien d’écriture (édition / création) — désactivé en lecture seule. */
export default function WriteLink({
  className = '',
  children,
  title,
  href,
  ...props
}: WriteLinkProps) {
  const { canWrite } = useSubscriptionAccess()

  if (!canWrite) {
    return (
      <span
        className={`${className} opacity-50 cursor-not-allowed pointer-events-none`}
        title={title ?? 'Lecture seule — activez une clé pour modifier'}
        aria-disabled
      >
        {children}
      </span>
    )
  }

  return (
    <Link href={href} className={className} title={title} {...props}>
      {children}
    </Link>
  )
}
