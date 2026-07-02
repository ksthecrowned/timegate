export type NavItem = {
  label: string
  href?: string
  faIcon?: string
  children?: NavItem[]
}

export type NavSection = {
  title: string
  items: NavItem[]
}

export const consoleNavSections: NavSection[] = [
  {
    title: 'Plateforme',
    items: [
      { label: 'Tableau de bord', href: '/', faIcon: 'fa-solid fa-gauge' },
      { label: 'Organisations', href: '/organizations', faIcon: 'fa-solid fa-building' },
      { label: 'Plans', href: '/plans', faIcon: 'fa-solid fa-layer-group' },
      { label: 'Paramètres', href: '/platform-settings', faIcon: 'fa-solid fa-sliders' },
      { label: 'Abonnements', href: '/subscriptions', faIcon: 'fa-solid fa-credit-card' },
    ],
  },
  {
    title: 'Référentiels',
    items: [
      { label: 'Audit logs', href: '/audit-logs', faIcon: 'fa-solid fa-clipboard-list' },
      { label: 'Pays', href: '/countries', faIcon: 'fa-solid fa-globe' },
      { label: 'Villes', href: '/cities', faIcon: 'fa-solid fa-city' },
    ],
  },
]
