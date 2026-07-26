import type { TourStep } from '../types'
import { dashboardTourSteps } from './dashboard'

export const managerTourSteps: TourStep[] = [
  {
    id: 'welcome',
    type: 'celebrate',
    module: 'Intro',
    title: 'Pilotez votre journée avec TimeGate',
    description:
      'En tant que manager, TimeGate vous donne le pouls de l’équipe : qui est là, qui manque, quoi valider. Cette visite parcourt les écrans du quotidien — dashboard, équipe, inbox, congés, pointage et planning — avec une explication claire de chaque zone.',
  },
  ...dashboardTourSteps,
  {
    id: 'team-nav',
    type: 'navigate',
    module: 'Équipe',
    path: '/manager/team',
    element: '[data-tour="manager-team"]',
    title: 'Qui est là, maintenant',
    description:
      'L’équipe du jour montre la présence live de vos collaborateurs. Repérez absents, retards et personnes en congé sans appeler le terrain. C’est votre brief matinal en une page.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'inbox-nav',
    type: 'navigate',
    module: 'Inbox',
    path: '/manager/inbox',
    element: '[data-tour="manager-inbox"]',
    title: 'Validez sans perdre le fil',
    description:
      'L’inbox concentre les demandes qui attendent votre décision. Ouvrez un élément ou explorez la liste — l’objectif est de traiter vite ce qui bloque un collègue. Moins de mails, plus de décisions tracées.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'leaves-nav',
    type: 'navigate',
    module: 'Congés',
    path: '/manager/leaves',
    element: '[data-tour="manager-leaves"]',
    title: 'Congés sous contrôle',
    description:
      'Le calendrier / la liste des congés manager vous montre les absences planifiées et les demandes en cours. Anticiper les trous de couverture évite les surprises le jour J.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'events-nav',
    type: 'navigate',
    module: 'Pointage',
    path: '/attendance/events',
    element: '[data-tour="attendance-events"]',
    title: 'Le terrain remonte ici',
    description:
      'Les événements de pointage remontent ce qui s’est passé aux kiosques. Surveillez les anomalies et les passages à revoir pour garder des timesheets propres.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'planning-nav',
    type: 'navigate',
    module: 'Planning',
    path: '/planning',
    element: '[data-tour="planning"]',
    title: 'Anticiper plutôt que subir',
    description:
      'Le planning équipe visualise les affectations à venir. Ajustez avant le rush plutôt qu’après les absences. C’est votre levier pour aligner charge et disponibilité.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'search-chrome',
    type: 'spotlight',
    module: 'Navigation',
    element: '[data-tour="search"]',
    title: 'Toujours trouvable',
    description:
      'La recherche globale retrouve employés, branches, départements ou kiosques en quelques caractères. Utilisez-la dès que vous connaissez un nom — plus rapide que de dérouler le menu.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'notif-chrome',
    type: 'spotlight',
    module: 'Navigation',
    element: '[data-tour="notifications"]',
    title: 'Toujours informé',
    description:
      'La cloche regroupe les alertes TimeGate : validations, anomalies, kiosques. Un badge indique le non-lu. Ouvrez-la pour traiter sans quitter le fil de votre journée.',
    side: 'bottom',
    align: 'end',
  },
  {
    id: 'done',
    type: 'celebrate',
    module: 'Fin',
    title: 'Prêt à manager',
    description:
      'Vous maîtrisez le dashboard, l’équipe du jour, l’inbox, les congés, le pointage et le planning. Relancez « Start tour » à tout moment. Bonne journée — votre équipe compte sur vous.',
  },
]
