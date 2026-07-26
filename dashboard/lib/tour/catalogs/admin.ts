import type { TourStep } from '../types'
import { dashboardTourSteps } from './dashboard'

export const adminTourSteps: TourStep[] = [
  {
    id: 'welcome',
    type: 'celebrate',
    module: 'Intro',
    title: 'Bienvenue — votre QG RH est prêt',
    description:
      'TimeGate centralise pointage, congés, planning et validation au même endroit. Cette visite vous montre où agir en premier pour passer de « compte créé » à « organisation opérationnelle ». Comptez quelques minutes — chaque étape explique l’écran sous vos yeux.',
  },
  ...dashboardTourSteps,
  {
    id: 'org-nav',
    type: 'navigate',
    module: 'Organisation',
    path: '/organization',
    element: '[data-tour="org-form"]',
    title: 'L’identité de votre entreprise',
    description:
      'Ce formulaire porte le nom, le logo, le fuseau horaire et les coordonnées de l’organisation. Ces informations apparaissent dans le dashboard, les exports et l’expérience employés. Prenez trente secondes pour vérifier que tout est exact — c’est la carte de visite TimeGate de votre marque.',
    side: 'left',
    align: 'start',
  },
  {
    id: 'org-save',
    type: 'requireSave',
    module: 'Organisation',
    path: '/organization',
    element: '[data-tour="org-form"]',
    required: true,
    title: 'Enregistrez pour ancrer votre marque',
    description:
      'Cliquez sur le bouton d’enregistrement du formulaire pour valider la fiche organisation. Tant que la sauvegarde n’est pas réussie, la visite attend ici — c’est volontaire : une org bien configurée évite les malentendus plus tard. Besoin de reporter ? Utilisez « Plus tard ».',
    side: 'left',
    align: 'start',
  },
  {
    id: 'employees-nav',
    type: 'navigate',
    module: 'Employés',
    path: '/employees',
    element: '[data-tour="employees-list"]',
    title: 'Votre équipe, centralisée',
    description:
      'La liste des employés est le cœur RH : identité, branche, poste, statut. Filtrez, cherchez et ouvrez une fiche en un clic. C’est ici que vous construisez l’annuaire vivant de TimeGate — sans tableur parallèle.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'employees-new',
    type: 'awaitAction',
    module: 'Employés',
    path: '/employees',
    element: '[data-tour-action="employees-new"]',
    actionSelector: '[data-tour-action="employees-new"]',
    title: 'Ajoutez votre premier talent',
    description:
      'Le bouton « Ajouter un employé » ouvre le formulaire de création. Cliquez dessus pour voir le parcours d’onboarding d’un collaborateur (vous pourrez enregistrer plus tard). TimeGate lie ensuite pointage, congés et planning à cette fiche.',
    side: 'left',
    align: 'start',
  },
  {
    id: 'branches-nav',
    type: 'navigate',
    module: 'Branches',
    path: '/branches',
    element: '[data-tour="branches-list"]',
    title: 'Multi-sites sans friction',
    description:
      'Les branches représentent vos sites ou entités. Elles structurent kiosques, équipes et reporting. Même avec un seul site aujourd’hui, créez la branche siège pour poser le décor géographique de TimeGate.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'branches-new',
    type: 'awaitAction',
    module: 'Branches',
    path: '/branches',
    element: '[data-tour-action="branches-new"]',
    actionSelector: '[data-tour-action="branches-new"]',
    title: 'Posez le décor',
    description:
      'Cliquez sur « Ajouter une branche » pour ouvrir le formulaire (ville, fuseau, etc.). Vous n’êtes pas obligé de sauvegarder pendant la visite — l’essentiel est de savoir où naissent vos sites.',
    side: 'left',
    align: 'start',
  },
  {
    id: 'kiosks-nav',
    type: 'navigate',
    module: 'Kiosques',
    path: '/kiosks',
    element: '[data-tour="kiosks-list"]',
    title: 'Le pointage, là où ça compte',
    description:
      'Les kiosques sont les terminaux de terrain (tablette, borne). Depuis cette liste vous suivez leur statut online/offline et vous provisionnez de nouveaux appareils. C’est le pont entre le cloud TimeGate et la porte d’entrée.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'events-nav',
    type: 'navigate',
    module: 'Pointage',
    path: '/attendance/events',
    element: '[data-tour="attendance-events"]',
    title: 'Chaque passage, tracé',
    description:
      'Les événements de pointage listent entrées, sorties et anomalies à revoir. Filtrez par date ou statut pour auditer une journée. C’est la matière première des timesheets et des validations manager.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'inbox-nav',
    type: 'navigate',
    module: 'Inbox',
    path: '/manager/inbox',
    element: '[data-tour="manager-inbox"]',
    title: 'Zéro dossier qui traîne',
    description:
      'L’inbox rassemble congés, échanges, claims et la messagerie. Traitez les validations ici, puis passez à Messagerie si besoin — sans chercher dans cinq menus. Un inbox vide en fin de journée, c’est une organisation sous contrôle.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'done',
    type: 'celebrate',
    module: 'Fin',
    title: 'Vous êtes opérationnel',
    description:
      'Vous savez lire le dashboard, soigner la fiche org, ouvrir employés, branches, kiosques, pointage et inbox. Relancez « Start tour » quand vous voulez — et passez à l’action réelle : invitez votre équipe et branchez le premier kiosque.',
  },
]
