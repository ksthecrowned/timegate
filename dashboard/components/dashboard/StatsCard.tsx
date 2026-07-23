'use client'
interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  iconBg?: string
  trend?: { value: number; label: string }
}

export default function StatsCard({ title, value, subtitle, icon, iconBg = 'bg-primary/10 text-primary', trend }: StatsCardProps) {
  return (
    <div className="flex flex-col tg-card">
      <div className="p-4 md:p-5">
        <div className="flex items-center gap-x-4">
          {icon && (
            <div className={`shrink-0 flex justify-center items-center size-[46px] rounded-full ${iconBg}`}>
              {icon}
            </div>
          )}
          <div className="grow">
            <div className="flex items-center gap-x-2">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-500">{title}</p>
            </div>
            <div className="mt-1 flex items-center gap-x-2">
              <h3 className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-neutral-200">
                {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
              </h3>
              {trend && (
                <span className={`inline-flex items-center gap-x-1 py-0.5 px-2 rounded-full text-xs font-medium ${trend.value >= 0 ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-800'}`}>
                  {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-gray-500 dark:text-neutral-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
