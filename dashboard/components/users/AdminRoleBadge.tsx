import { getRoleLabel } from '@/lib/timegate/roles'

export function AdminRoleBadge({ role }: { role: string }) {
  const className =
    role === 'ADMIN'
      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
      : role === 'MANAGER'
        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {getRoleLabel(role)}
    </span>
  )
}
