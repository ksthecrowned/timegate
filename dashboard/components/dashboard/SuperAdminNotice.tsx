'use client'

const consoleUrl =
  process.env.NEXT_PUBLIC_CONSOLE_URL ??
  process.env.NEXT_PUBLIC_SUPER_ADMIN_URL ??
  'http://localhost:3002'

export default function SuperAdminNotice() {
  return (
    <div className="tg-card shadow-2xs p-8 max-w-xl mx-auto text-center space-y-4">
      <i className="fa-solid fa-shield-halved text-4xl text-primary" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        Console Plateforme déplacée
      </h2>
      <p className="text-sm text-gray-600 dark:text-neutral-400">
        La gestion plateforme (organisations, plans, clés) n&apos;est plus disponible dans ce
        dashboard tenant. Utilisez l&apos;application Console Plateforme dédiée.
      </p>
      <a
        href={consoleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Ouvrir Console Plateforme
        <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
      </a>
    </div>
  )
}
