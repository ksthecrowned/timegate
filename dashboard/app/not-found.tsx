import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-surface-elevated-dark px-4">
      <img src="/images/404.gif" alt="404" className="w-64 h-auto mb-6 rounded-xl" />
      <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">Page introuvable</h1>
      <p className="text-gray-500 dark:text-neutral-400 mb-6">La page que vous cherchez n'existe pas.</p>
      <Link
        href="/dashboard"
        className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:from-secondary hover:to-primary transition-all"
      >
        Retour au Dashboard
      </Link>
    </div>
  )
}
