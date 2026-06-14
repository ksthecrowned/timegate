import type { SwitcherGroupOption } from '@/components/ui/Switcher'

/** Permissions admin — à aligner sur l'API rôles. */
export const adminPermissionOptions: SwitcherGroupOption[] = [
  { id: 'dashboard', label: 'Tableau de bord', description: 'Accès aux statistiques' },
  { id: 'enterprises', label: 'Entreprises', description: 'Gestion des entreprises' },
  { id: 'products', label: 'Produits', description: 'Catalogue et modération produits' },
  { id: 'orders', label: 'Commandes', description: 'Suivi des commandes' },
  { id: 'riders', label: 'Riders', description: 'Gestion des livreurs' },
  { id: 'consumers', label: 'Consommateurs', description: 'Gestion des clients' },
  { id: 'ads', label: 'Publicités', description: 'Campagnes publicitaires' },
  { id: 'settings', label: 'Paramètres', description: 'Configuration système' },
]

export function emptyPermissions(): Record<string, boolean> {
  return Object.fromEntries(adminPermissionOptions.map((p) => [p.id, false]))
}
