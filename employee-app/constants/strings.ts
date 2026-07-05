/**
 * Strings for the employee mobile app.
 * Localized to French to match the dashboard.
 */

export const STRINGS = {
  // App-wide
  app: {
    name: 'TimeGate',
    loading: 'Chargement...',
    retry: 'Réessayer',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    back: 'Retour',
    close: 'Fermer',
    confirm: 'Confirmer',
    yes: 'Oui',
    no: 'Non',
    search: 'Rechercher',
    endOfList: '— fin de la liste —',
    noResults: 'Aucun résultat',
  },

  // Auth
  auth: {
    login: 'Connexion',
    logout: 'Déconnexion',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    signIn: 'Se connecter',
    continue: 'Continuer',
    checkEmailHint:
      'Si un compte employé existe pour cet e-mail, suivez les instructions reçues.',
    activateAccount: 'Activer mon compte',
    devicePendingTitle: 'Appareil en attente',
    devicePendingBody:
      'Votre appareil doit être approuvé par un administrateur avant le pointage (QR, reprise pause).',
    welcomeBack: 'Bon retour',
    welcomeMessage: 'Connectez-vous à votre espace TimeGate',
    invalidCredentials: 'Identifiants invalides',
    logoutConfirm: 'Voulez-vous vraiment vous déconnecter ?',
    forgotPassword: 'Mot de passe oublié ?',
    forgotPasswordTitle: 'Mot de passe oublié',
    forgotPasswordSubtitle: 'Entrez votre e-mail ; nous vous enverrons un code de réinitialisation.',
    sendCode: 'Envoyer le code',
    codeSent: 'Un code a été envoyé à votre adresse e-mail.',
    verifyCodeTitle: 'Vérifier le code',
    verifyCodeSetupTitle: 'Activer votre compte',
    verifyCodeSubtitle: 'Saisissez le code à 6 chiffres reçu par e-mail.',
    verifyCodeSetupSubtitle:
      'Première connexion : saisissez le code reçu pour créer votre mot de passe.',
    codeResend: 'Renvoyer le code',
    codeResendIn: (s: number) => `Renvoyer dans ${s}s`,
    resetPasswordTitle: 'Nouveau mot de passe',
    setupPasswordTitle: 'Créer votre mot de passe',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
    passwordTooShort: 'Le mot de passe doit contenir au moins 8 caractères',
    resetSuccess: 'Mot de passe réinitialisé. Vous pouvez vous connecter.',
    setupSuccess: 'Compte activé. Connexion en cours…',
    continueToApp: 'Accéder à l’application',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    backToLogin: 'Retour à la connexion',
    codeInvalid: 'Code invalide ou expiré',
    biometricSignIn: 'Connexion biométrique',
    enableBiometric: 'Activer la connexion biométrique sur cet appareil',
    biometricMissingCredentials: 'Aucun identifiant biométrique enregistré.',
  },

  // Generic errors
  errors: {
    networkError: 'Erreur réseau',
    unauthorized: 'Session expirée. Veuillez vous reconnecter.',
    invalidEmail: 'Adresse e-mail invalide',
    required: 'Champ requis',
  },

  // Home
  home: {
    greetingMorning: 'Bonjour',
    greetingAfternoon: 'Bon après-midi',
    greetingEvening: 'Bonsoir',
    welcomeBack: 'Heureux de vous revoir',
    leaveDays: 'Jours de congé',
    pending: 'En attente',
    swaps: 'Échanges',
    quickActions: 'Actions rapides',
    actionRequestLeave: 'Demander un congé',
    actionSwapShift: 'Échanger un shift',
    actionMyPlanning: 'Mon planning',
    actionAttendance: 'Pointage',
    actionMyQr: 'Mon QR',
    actionBreakResume: 'Reprendre la pause',
  },

  breakResume: {
    title: 'Reprise de pause',
    headline: 'Fin de pause',
    siteLabel: 'Site',
    eligibleHint:
      'Vous pouvez enregistrer votre reprise de pause depuis votre téléphone, sur le site uniquement.',
    notEligibleDefault: 'Reprise non disponible pour le moment.',
    geoRadius: (m: number) => `Périmètre autorisé : ${m} m autour du site.`,
    action: 'Reprendre la pause',
    locationDenied: 'Autorisez la localisation pour reprendre la pause sur site.',
    successTitle: 'Pause reprise',
    errorTitle: 'Reprise impossible',
    kioskFallback:
      'Vous pouvez aussi reprendre la pause au kiosk TimeGate (même règle horaire).',
    webGeoNote:
      'Sur navigateur, la géolocalisation peut être moins précise qu’en application native.',
  },

  qrPunch: {
    title: 'Mon QR de pointage',
    subtitle: 'Présentez ce code à la borne TimeGate pour pointer.',
    inactiveTitle: 'QR non activé',
    inactiveHint:
      'Votre administrateur doit activer le QR de pointage depuis votre fiche employé.',
    loadError: 'Impossible de charger le QR. Vérifiez votre connexion.',
    refreshIn: (countdown: string) => `Renouvellement dans ${countdown}`,
    hint:
      'Le code se renouvelle automatiquement chaque minute. Gardez l’écran allumé et la connexion active au moment du scan.',
  },

  // Leave
  leave: {
    title: 'Congés',
    leaveRequests: 'Demandes de congé',
    all: 'Tous',
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Refusé',
    noRequests: 'Aucune demande de congé',
    noRequestsHint: 'Touchez + pour en créer une.',
    differentFilter: 'Essayez un autre filtre.',
    from: 'Du',
    to: 'Au',
    reason: 'Motif',
    newRequest: 'Nouvelle demande',
    requestLeave: 'Demande de congé',
    leaveType: 'Type de congé',
    selectLeaveType: 'Sélectionner un type',
    startDate: 'Date de début',
    endDate: 'Date de fin',
    reasonOptional: 'Motif (facultatif)',
    submit: 'Envoyer',
    submitSuccess: 'Demande envoyée avec succès',
    submitError: 'Échec de l\'envoi de la demande',
    fillAllFields: 'Veuillez remplir tous les champs requis',
    chooseDates: 'Choisir les dates',
    endDateBeforeStart: 'La date de fin doit être après la date de début',
    invalidDate: 'Date invalide (format attendu : AAAA-MM-JJ)',
    attachmentLabel: 'Justificatif (facultatif)',
    attachmentHint: 'Joindre un fichier PDF ou image',
  },

  // Shift swaps
  swaps: {
    title: 'Échanges de shift',
    all: 'Tous',
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Refusé',
    noRequests: 'Aucun échange de shift',
    noRequestsHint: 'Touchez + pour en demander un.',
    differentFilter: 'Essayez un autre filtre.',
    newRequest: 'Nouvelle demande',
    requestSwap: 'Demande d\'échange',
    shiftId: 'ID du shift',
    swapWithUserId: 'ID du collègue',
    reason: 'Motif',
    submit: 'Envoyer',
    submitSuccess: 'Demande envoyée',
    submitError: 'Échec de l\'envoi',
    fillAllFields: 'Veuillez remplir tous les champs requis',
    shift: 'Shift',
    colleague: 'Collègue',
    swapDate: 'Date de l\'échange',
    chooseShift: 'Choisir un shift',
    chooseColleague: 'Choisir un collègue',
    noShifts: 'Aucun shift à échanger dans les 14 prochains jours',
    searchColleague: 'Rechercher un collègue',
  },

  // Notifications
  notifications: {
    title: 'Alertes',
    markAll: 'Tout marquer',
    all: 'Toutes',
    unread: 'Non lues',
    noNotifications: 'Aucune notification',
    noUnread: 'Aucune notification non lue',
    caughtUp: 'Tout est à jour',
    unreadCount: (n: number) => `${n} notification${n > 1 ? 's' : ''} non lue${n > 1 ? 's' : ''}`,
    justNow: 'à l\'instant',
    minutesAgo: (n: number) => `il y a ${n} min`,
    hoursAgo: (n: number) => `il y a ${n} h`,
    daysAgo: (n: number) => `il y a ${n} j`,
    activitySubtitle: 'Votre activité récente',
  },

  // More / menu
  more: {
    title: 'Plus',
    sectionPersonal: 'Personnel',
    sectionSchedule: 'Planning',
    profile: 'Profil',
    profileDesc: 'Voir et modifier vos informations',
    attendance: 'Pointage',
    attendanceDesc: 'Pointages et historique',
    planning: 'Planning',
    planningDesc: 'Votre planning en un coup d\'œil',
    leaveBalances: 'Solde de congés',
    leaveBalancesDesc: 'Voir vos jours restants',
    leaveTypes: 'Types de congé',
    leaveTypesDesc: 'Catégories de congé disponibles',
  },

  // Profile
  profile: {
    title: 'Profil',
    email: 'E-mail',
    phone: 'Téléphone',
    position: 'Poste',
    department: 'Département',
    branch: 'Branche',
    loadingError: 'Échec du chargement du profil',
    notLoaded: 'Profil non chargé',
    edit: 'Modifier le profil',
    changePassword: 'Changer le mot de passe',
    save: 'Enregistrer',
    saved: 'Profil mis à jour',
    passwordChanged: 'Mot de passe modifié',
    organization: 'Organisation',
    language: 'Langue',
    firstName: 'Prénom',
    lastName: 'Nom',
    currentPassword: 'Mot de passe actuel',
  },

  // Tabs
  tabs: {
    activity: 'Activité',
  },

  // Attendance
  attendance: {
    title: 'Pointage',
    statusPresent: 'Présent',
    statusAbsent: 'Absent',
    statusHalfDay: 'Demi-journée',
    statusOnLeave: 'En congé',
    statusOnHoliday: 'Jour férié',
    statusWorkFromHome: 'Télétravail',
    noRecords: 'Aucun pointage trouvé',
    dateRange: 'Période',
    last7: '7 derniers jours',
    last30: '30 derniers jours',
    last90: '90 derniers jours',
  },

  punchClaim: {
    title: 'Réclamation pointage',
    subtitle:
      'Signalez un oubli de pointage, un départ anticipé ou une pause non prise. Votre manager sera notifié.',
    banner: 'Signaler un problème de pointage',
    workDate: 'Date concernée',
    typeLabel: 'Type de réclamation',
    reasonLabel: 'Motif',
    reasonPlaceholder: 'Décrivez la situation…',
    reasonRequired: 'Le motif est obligatoire.',
    invalidDate: 'Date invalide (AAAA-MM-JJ).',
    submit: 'Envoyer la réclamation',
    submitSuccess: 'Réclamation envoyée',
    submitError: 'Envoi impossible.',
    types: {
      earlyDeparture: 'Départ anticipé',
      missedCheckout: 'Oubli check-out',
      breakNotTaken: 'Pause non prise',
      other: 'Autre',
    },
  },

  contracts: {
    title: 'Mes contrats',
    menuDesc: 'Contrats de travail et documents PDF',
    noContracts: 'Aucun contrat disponible',
    currentContract: 'Contrat en cours',
    pastContract: 'Ancien contrat',
    active: 'Actif',
    signedAt: 'Signé le',
    expiresAt: 'Expire le',
    viewPdf: 'Voir le PDF',
    noPdf: 'Document non disponible',
  },

  // Planning
  planning: {
    title: 'Planning',
    noData: 'Aucune donnée de planning',
    thisWeek: 'Cette semaine',
    nextWeek: 'Semaine prochaine',
    previousWeek: 'Semaine précédente',
    weekOf: (d: string) => `Semaine du ${d}`,
  },

  // Leave balances
  leaveBalances: {
    title: 'Solde de congés',
    remaining: 'Restant',
    used: 'Utilisé',
    allocated: 'Alloué',
    noData: 'Aucun solde disponible',
    loading: 'Chargement...',
    summary: 'Total restant',
  },

  // Leave types
  leaveTypes: {
    title: 'Types de congé',
    daysAllocated: 'jours alloués',
    noData: 'Aucun type de congé',
  },
};

export type Strings = typeof STRINGS;