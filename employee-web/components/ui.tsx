import type { ReactNode } from 'react'

export function MobileCard({
  title,
  children,
  className = '',
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-card-border bg-card p-4 shadow-sm ${className}`}
    >
      {title ? <h2 className="mb-3 text-base font-bold text-white">{title}</h2> : null}
      {children}
    </section>
  )
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = 'button',
  className = '',
}: {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-full bg-btn py-3.5 text-sm font-bold text-white transition-opacity disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
      {message}
    </p>
  )
}

export function SuccessBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
      {message}
    </p>
  )
}
