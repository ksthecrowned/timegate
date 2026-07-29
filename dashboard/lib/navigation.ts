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

/**
 * Navigation dashboard — sections regroupées :
 * Menu · Manager · Structure & planning · RH · Présence · Paie · Administration
 */
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
      { label: 'Boite de réception', href: '/manager/inbox', faIcon: 'fa-solid fa-inbox' },
      { label: 'Absences équipe', href: '/manager/leaves', faIcon: 'fa-solid fa-umbrella-beach' },
    ],
  },
  {
    title: 'Structure & planning',
    roles: ['ADMIN', 'MANAGER'],
    items: [
      {
        label: 'Lieux',
        faIcon: 'fa-solid fa-map-location-dot',
        children: [
          { label: 'Branches', href: '/branches', faIcon: 'fa-solid fa-code-branch' },
          { label: 'Bornes / kiosques', href: '/kiosks', faIcon: 'fa-solid fa-tablet-screen-button' },
        ],
      },
      {
        label: 'Organisation',
        faIcon: 'fa-solid fa-sitemap',
        roles: ['ADMIN'],
        children: [
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
            label: 'Types de contrat',
            href: '/employment-types',
            faIcon: 'fa-solid fa-file-signature',
            roles: ['ADMIN'],
          },
        ],
      },
      {
        label: 'Temps',
        faIcon: 'fa-solid fa-calendar-days',
        children: [
          {
            label: 'Horaires',
            href: '/shift-types',
            faIcon: 'fa-solid fa-clock-rotate-left',
            roles: ['ADMIN'],
          },
          {
            label: 'Affectations',
            href: '/shift-assignments',
            faIcon: 'fa-solid fa-user-clock',
          },
          {
            label: 'Exceptions (date)',
            href: '/schedule-day-exceptions',
            faIcon: 'fa-solid fa-calendar-day',
          },
          {
            label: 'Planning prévu',
            href: '/planning',
            faIcon: 'fa-solid fa-calendar-days',
          },
          {
            label: 'Échanges de poste',
            href: '/shift-swaps',
            faIcon: 'fa-solid fa-right-left',
          },
          {
            label: 'Jours fériés',
            href: '/holidays',
            faIcon: 'fa-solid fa-calendar-xmark',
            roles: ['ADMIN'],
          },
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
        faIcon: 'fa-solid fa-umbrella-beach',
        roles: ['ADMIN'],
        children: [
          {
            label: 'Demandes de congé',
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
        ],
      },
      {
        label: 'Absences',
        href: '/absences',
        faIcon: 'fa-solid fa-user-xmark',
      },
      {
        label: 'Retards à justifier',
        href: '/late-records',
        faIcon: 'fa-solid fa-hourglass-half',
      },
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
            label: 'Registre de présence',
            href: '/attendance/days',
            faIcon: 'fa-solid fa-calendar-day',
          },
          {
            label: 'Événements de pointage',
            href: '/attendance/events',
            faIcon: 'fa-solid fa-list-check',
          },
          {
            label: 'Temps travaillé',
            href: '/timesheets',
            faIcon: 'fa-solid fa-file-lines',
          },
        ],
      },
      {
        label: 'Logs biométriques',
        href: '/face-recognition-logs',
        faIcon: 'fa-solid fa-face-smile',
        roles: ['ADMIN'],
      },
    ],
  },
  {
    title: 'Paie',
    roles: ['ADMIN'],
    items: [
      {
        label: 'Cycles de paie',
        href: '/payroll-runs',
        faIcon: 'fa-solid fa-file-invoice-dollar',
      },
      {
        label: 'Rémunérations de base',
        href: '/salaries',
        faIcon: 'fa-solid fa-money-bill-wave',
      },
    ],
  },
  {
    title: 'Administration',
    roles: ['ADMIN', 'MANAGER'],
    items: [
      {
        label: 'Configuration',
        faIcon: 'fa-solid fa-gears',
        roles: ['ADMIN'],
        children: [
          {
            label: 'Organisation',
            href: '/organization',
            faIcon: 'fa-solid fa-building-circle-check',
            roles: ['ADMIN'],
          },
          {
            label: 'Paramètres de pointage',
            href: '/organization/attendance-settings',
            faIcon: 'fa-solid fa-sliders',
            roles: ['ADMIN'],
          },
          {
            label: 'Règles d’alertes',
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
            label: 'Analytics produit',
            href: '/organization/analytics',
            faIcon: 'fa-solid fa-chart-line',
            roles: ['ADMIN'],
          },
        ],
      },
      {
        label: 'Accès',
        faIcon: 'fa-solid fa-shield-halved',
        children: [
          {
            label: 'Utilisateurs',
            href: '/users',
            faIcon: 'fa-solid fa-users-gear',
            roles: ['ADMIN'],
          },
          {
            label: 'Téléphones employés',
            href: '/trusted-devices',
            faIcon: 'fa-solid fa-mobile-screen',
            roles: ['ADMIN', 'MANAGER'],
          },
          {
            label: "Journaux d'audit",
            href: '/audit-logs',
            faIcon: 'fa-solid fa-clipboard-list',
            roles: ['ADMIN'],
          },
        ],
      },
      {
        label: 'Mon abonnement',
        href: '/subscriptions',
        faIcon: 'fa-solid fa-credit-card',
        roles: ['ADMIN'],
      },
    ],
  },
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
        if (!itemVisible(item, role)) return null
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
