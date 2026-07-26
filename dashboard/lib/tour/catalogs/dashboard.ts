import type { TourStep } from '../types'

/** Shared home walkthrough — each spotlight explains the visible UI. */
export const dashboardTourSteps: TourStep[] = [
  {
    id: 'dash-header',
    type: 'spotlight',
    module: 'Dashboard',
    element: '[data-tour="home-header"]',
    title: 'Votre tableau de bord TimeGate',
    description:
      'Ici se trouve le titre de la page et les actions du jour : relancer le tour guidé ou actualiser les indicateurs. C’est la tête de pont de votre QG RH — tout ce qui suit descend de cette vue. Prenez l’habitude d’ouvrir TimeGate ici chaque matin.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'dash-today',
    type: 'spotlight',
    module: 'Dashboard',
    element: '[data-tour="home-today"]',
    title: 'Le pouls de votre organisation',
    description:
      'Ce bandeau résume la journée : présents, absents, congés, retards, et ce qui attend une validation. Chaque tuile est cliquable pour plonger dans le détail. En bas, le statut des kiosques vous alerte si un terminal est hors ligne. C’est votre point de départ pour savoir où concentrer votre attention.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'dash-kpis',
    type: 'spotlight',
    module: 'Dashboard',
    element: '[data-tour="home-kpis"]',
    title: 'Les chiffres qui comptent',
    description:
      'Ces cartes KPI condensent la santé de votre organisation : effectifs, sites, kiosques, couverture planning, absences ou retards selon votre rôle. Un clic ouvre le module concerné. Elles vous donnent une lecture stratégique sans ouvrir dix menus.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'dash-analytics',
    type: 'spotlight',
    module: 'Dashboard',
    element: '[data-tour="home-analytics"]',
    title: 'La tendance, pas seulement l’instant',
    description:
      'Les graphiques montrent l’évolution récente (présences, retards, planning vs réalisé). Lisez-les pour anticiper les pics d’absences ou les écarts de couverture. Si aucun graphique n’est encore disponible, cette étape est simplement ignorée.',
    side: 'top',
    align: 'start',
  },
  {
    id: 'dash-quick',
    type: 'spotlight',
    module: 'Dashboard',
    element: '[data-tour="home-quick"]',
    title: 'Raccourcis vers l’essentiel',
    description:
      'L’accès rapide regroupe les écrans que vous utilisez le plus : équipe, inbox, pointage, congés, kiosques… Chaque tuile est un atterrissage direct. Personnalisez votre journée en partant d’ici plutôt que de parcourir tout le menu.',
    side: 'top',
    align: 'start',
  },
]
