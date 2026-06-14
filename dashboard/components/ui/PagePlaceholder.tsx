import Link from 'next/link'
import { Construction } from 'lucide-react'

interface PagePlaceholderProps {
  title: string
  description?: string
  backHref?: string
}

export default function PagePlaceholder({ title, description, backHref }: PagePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{title}</h1>
      <p className="text-sm text-gray-500 dark:text-neutral-400 max-w-sm mb-6">
        {description || 'Cette page est prête à être connectée à votre API. Remplacez le contenu par vos composants métier.'}
      </p>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-x-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary transition-all"
        >
          ← Retour
        </Link>
      )}
    </div>
  )
}
