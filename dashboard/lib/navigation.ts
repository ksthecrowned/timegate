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

const TIMEGATE_PREFIX = '/timegate'

/** @deprecated Ancien préfixe URL — conservé pour liens/bookmarks ; redirigé vers la racine. */
export function stripLegacyTimegatePrefix(pathname: string): string {
  if (pathname === TIMEGATE_PREFIX) return '/'
  if (pathname.startsWith(`${TIMEGATE_PREFIX}/`)) {
    return pathname.replace(/^\/timegate/, '') || '/'
  }
  return pathname
}

export const timegateNavSections: NavSection[] = [
  {
    title: 'Menu principal',
    items: [{ label: 'Tableau de bord', href: '/', faIcon: 'fa-solid fa-gauge' }],
  },
  {
    title: 'Manager',
    roles: ['ADMIN', 'MANAGER'],
    items: [
      { label: 'Équipe du jour', href: '/manager/team', faIcon: 'fa-solid fa-people-group' },
      { label: 'Boîte de réception', href: '/manager/inbox', faIcon: 'fa-solid fa-inbox' },
      { label: 'Calendrier congés', href: '/manager/leaves', faIcon: 'fa-solid fa-umbrella-beach' },
    ],
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
        label: 'Règles notifications',
        href: '/organization/notification-rules',
        faIcon: 'fa-solid fa-bell',
        roles: ['ADMIN'],
      },
      {
        label: 'Consommation IA',
        href: '/organization/ai-usage',
        faIcon: 'fa-solid fa-wand-magic-sparkles',
        roles: ['ADMIN'],
      },
      {
        label: 'Reconnaissance & retards',
        href: '/system-config',
        faIcon: 'fa-solid fa-face-smile',
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
        label: 'Mon abonnement',
        href: '/subscriptions',
        faIcon: 'fa-solid fa-credit-card',
        roles: ['ADMIN'],
      },
      {
        label: 'Appareils en attente',
        href: '/trusted-devices',
        faIcon: 'fa-solid fa-mobile-screen',
        roles: ['ADMIN', 'MANAGER'],
      },
      {
        label: 'Journaux d\'audit',
        href: '/audit-logs',
        faIcon: 'fa-solid fa-clipboard-list',
        roles: ['ADMIN'],
      },
    ],
  },
]

/** Paths reserved for tenant operations — super admin is redirected away. */
export const operationalPathPrefixes = [
  '/manager',
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
