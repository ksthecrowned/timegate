import type { TimeGateRole } from '@/lib/timegate/types'

export type NavItem = {
  label: string
  href?: string
  faIcon?: string
  roles?: TimeGateRole[]
  children?: NavItem[]
}

export type NavSection = {
  title: string
  roles?: TimeGateRole[]
  items: NavItem[]
}

export const timegateNavSections: NavSection[] = [
  {
    title: 'Menu principal',
    items: [{ label: 'Tableau de bord', href: '/', faIcon: 'fa-solid fa-gauge' }],
  },
  {
    title: 'Organisation',
    roles: ['ADMIN', 'MANAGER'],
    items: [
      {
        label: 'Configuration',
        href: '/organization',
        faIcon: 'fa-solid fa-building-circle-check',
        roles: ['ADMIN'],
      },
      {
        label: 'Paramètres pointage',
        href: '/organization/attendance-settings',
        faIcon: 'fa-solid fa-sliders',
        roles: ['ADMIN'],
      },
      {
        label: 'Structure',
        faIcon: 'fa-solid fa-building',
        children: [
          { label: 'Branches', href: '/branches', faIcon: 'fa-solid fa-code-branch' },
          { label: 'Kiosques', href: '/kiosks', faIcon: 'fa-solid fa-tablet-screen-button' },
          {
            label: 'Départements',
            href: '/departments',
            faIcon: 'fa-solid fa-sitemap',
            roles: ['ADMIN'],
          },
          {
            label: 'Postes',
            href: '/designations',
            faIcon: 'fa-solid fa-id-badge',
            roles: ['ADMIN'],
          },
          {
            label: 'Horaires',
            href: '/shift-types',
            faIcon: 'fa-solid fa-clock-rotate-left',
            roles: ['ADMIN'],
          },
          {
            label: 'Jours ouvrés',
            href: '/work-days',
            faIcon: 'fa-solid fa-calendar-week',
            roles: ['ADMIN'],
          },
          {
            label: 'Affectations',
            href: '/shift-assignments',
            faIcon: 'fa-solid fa-user-clock',
          },
          { label: 'Planning équipe', href: '/planning', faIcon: 'fa-solid fa-calendar-days' },
          { label: 'Échanges shifts', href: '/shift-swaps', faIcon: 'fa-solid fa-right-left' },
        ],
      },
    ],
  },
  {
    title: 'Ressources humaines',
    roles: ['ADMIN', 'MANAGER'],
    items: [
      { label: 'Employés', href: '/employees', faIcon: 'fa-solid fa-users' },
      {
        label: 'Congés',
        href: '/leaves',
        faIcon: 'fa-solid fa-umbrella-beach',
        roles: ['ADMIN'],
      },
      {
        label: 'Types de congé',
        href: '/leave-types',
        faIcon: 'fa-solid fa-list',
        roles: ['ADMIN'],
      },
      { label: 'Absences', href: '/absences', faIcon: 'fa-solid fa-user-xmark' },
      { label: 'Retards', href: '/late-records', faIcon: 'fa-solid fa-hourglass-half' },
    ],
  },
  {
    title: 'Présence',
    roles: ['ADMIN', 'MANAGER'],
    items: [
      {
        label: 'Pointage',
        faIcon: 'fa-solid fa-clock',
        children: [
          {
            label: 'Jours de présence',
            href: '/attendance/days',
            faIcon: 'fa-solid fa-calendar-day',
          },
          {
            label: 'Événements',
            href: '/attendance/events',
            faIcon: 'fa-solid fa-list-check',
          },
          {
            label: 'Feuilles de temps',
            href: '/timesheets',
            faIcon: 'fa-solid fa-file-lines',
          },
        ],
      },
      {
        label: 'Journaux de reconnaissance',
        href: '/face-recognition-logs',
        faIcon: 'fa-solid fa-face-smile',
      },
    ],
  },
  {
    title: 'Paie',
    roles: ['ADMIN'],
    items: [
      {
        label: 'Paies',
        href: '/payroll-runs',
        faIcon: 'fa-solid fa-file-invoice-dollar',
      },
      { label: 'Salaires', href: '/salaries', faIcon: 'fa-solid fa-money-bill-wave' },
    ],
  },
  {
    title: 'Calendrier',
    roles: ['ADMIN'],
    items: [{ label: 'Jours fériés', href: '/holidays', faIcon: 'fa-solid fa-calendar-day' }],
  },
  {
    title: 'Administration',
    roles: ['ADMIN', 'MANAGER'],
    items: [
      {
        label: 'Utilisateurs',
        href: '/admins',
        faIcon: 'fa-solid fa-user-shield',
        roles: ['ADMIN'],
      },
      {
        label: 'SaaS',
        faIcon: 'fa-solid fa-gear',
        children: [
          {
            label: 'Journaux audit',
            href: '/audit-logs',
            faIcon: 'fa-solid fa-clipboard-list',
          },
          {
            label: 'Abonnements',
            href: '/subscriptions',
            faIcon: 'fa-solid fa-credit-card',
            roles: ['ADMIN'],
          },
          {
            label: 'Config système',
            href: '/system-config',
            faIcon: 'fa-solid fa-sliders',
            roles: ['ADMIN'],
          },
        ],
      },
    ],
  },
  {
    title: 'Plateforme SaaS',
    roles: ['SUPER_ADMIN'],
    items: [
      {
        label: 'Super admin',
        faIcon: 'fa-solid fa-shield-halved',
        children: [
          {
            label: 'Organisations',
            href: '/super-admin/organizations',
            faIcon: 'fa-solid fa-building',
          },
          {
            label: 'Pays',
            href: '/countries',
            faIcon: 'fa-solid fa-earth-africa',
          },
          {
            label: 'Villes',
            href: '/cities',
            faIcon: 'fa-solid fa-city',
          },
          {
            label: 'Journaux audit',
            href: '/audit-logs',
            faIcon: 'fa-solid fa-clipboard-list',
          },
          {
            label: 'Abonnements',
            href: '/subscriptions',
            faIcon: 'fa-solid fa-credit-card',
          },
          {
            label: 'Config système',
            href: '/system-config',
            faIcon: 'fa-solid fa-sliders',
          },
        ],
      },
    ],
  },
]

/** Paths reserved for tenant operations — super admin is redirected away. */
export const operationalPathPrefixes = [
  '/employees',
  '/branches',
  '/kiosks',
  '/departments',
  '/designations',
  '/shift-types',
  '/shift-assignments',
  '/planning',
  '/shift-swaps',
  '/work-days',
  '/leaves',
  '/leave-types',
  '/absences',
  '/late-records',
  '/attendance',
  '/timesheets',
  '/face-recognition-logs',
  '/payroll-runs',
  '/salaries',
  '/holidays',
  '/admins',
]

function itemVisible(item: NavItem, role?: TimeGateRole | null): boolean {
  if (!item.roles) return true
  if (!role) return false
  return item.roles.includes(role)
}

function filterItems(items: NavItem[], role?: TimeGateRole | null): NavItem[] {
  return items
    .map((item) => {
      if (item.children) {
        const children = filterItems(item.children, role)
        if (children.length === 0) return null
        return { ...item, children }
      }
      return itemVisible(item, role) ? item : null
    })
    .filter((item): item is NavItem => item !== null)
}

export function getNavSectionsForRole(role?: TimeGateRole | null): NavSection[] {
  return timegateNavSections
    .filter((section) => {
      if (!section.roles) return true
      if (!role) return false
      return section.roles.includes(role)
    })
    .map((section) => ({
      ...section,
      items: filterItems(section.items, role),
    }))
    .filter((section) => section.items.length > 0)
}
