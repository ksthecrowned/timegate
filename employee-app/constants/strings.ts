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

  a11y: {
    back: 'Retour',
    home: 'Accueil TimeGate',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    notifications: 'Notifications',
    notificationsWithCount: (n: number) =>
      n <= 0
        ? 'Notifications'
        : n === 1
          ? 'Notifications, 1 non lue'
          : `Notifications, ${n} non lues`,
    profile: 'Profil',
    search: 'Rechercher',
    filterSelected: (label: string) => `Filtre ${label}, sélectionné`,
    filter: (label: string) => `Filtre ${label}`,
    logout: 'Se déconnecter',
    actionBlocked: 'Action indisponible : appareil en attente d’approbation',
    openDrawerTab: 'Menu Plus',
    stat: (label: string, value: string) => `${label} : ${value}`,
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
      'Aucun compte employé actif trouvé pour cet e-mail, ou le compte n’est pas encore activé. Vérifiez l’adresse, ou utilisez « Mot de passe oublié » / demandez l’activation à votre administrateur.',
    enterPasswordHint: 'Saisissez votre mot de passe pour continuer.',
    changeEmail: 'Changer d’e-mail',
    activateAccount: 'Activer mon compte',
    devicePendingTitle: 'Appareil en attente',
    devicePendingBody:
      'Votre appareil doit être approuvé par un administrateur avant le pointage (QR, reprise pause).',
    deviceOnboardingTitle: 'Sécurisez votre appareil',
    deviceOnboardingSubtitle:
      'Pour éviter les usurpations, TimeGate n’autorise le pointage que sur un téléphone validé.',
    deviceOnboardingStep1Title: 'Cet appareil est enregistré',
    deviceOnboardingStep1Body:
      'Il est en attente d’approbation par votre administrateur RH.',
    deviceOnboardingStep2Title: 'Vous pouvez déjà consulter',
    deviceOnboardingStep2Body:
      'Planning, congés et profil restent disponibles pendant l’attente.',
    deviceOnboardingStep3Title: 'Pointage après validation',
    deviceOnboardingStep3Body:
      'QR et reprise de pause se débloquent dès que l’appareil est approuvé.',
    deviceOnboardingCta: 'J’ai compris',
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
    quickActions: 'Autres actions',
    todayTitle: 'Aujourd’hui',
    noShiftToday: 'Aucun shift prévu aujourd’hui',
    shiftToday: (name: string, window: string) =>
      window ? `${name} · ${window}` : name,
    statusNotStarted: 'Pas encore pointé',
    statusOnSite: 'Présent sur site',
    statusOnBreak: 'En pause',
    statusDone: 'Journée terminée',
    statusUnknown: 'Statut du jour',
    statusOff: 'Jour de repos',
    statusLeave: 'En congé',
    statusHoliday: 'Jour férié',
    primaryPunch: 'Pointer par QR',
    primaryBreak: 'Reprendre la pause',
    primaryAttendance: 'Voir mon pointage',
    primaryPlanning: 'Voir mon planning',
    offlinePending: (n: number) =>
      n === 1
        ? '1 pointage en attente de sync'
        : `${n} pointages en attente de sync`,
    offlineSyncNow: 'Synchroniser',
    actionRequestLeave: 'Demander un congé',
    actionSwapShift: 'Échanger un shift',
    actionMyPlanning: 'Mon planning',
    actionAttendance: 'Pointage',
    actionMyQr: 'Pointer par QR',
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
    title: 'Pointer par QR',
    subtitle: 'Scannez le QR affiché sur la borne TimeGate pour pointer.',
    cameraPermission: 'Autorisez la caméra pour scanner le QR de la borne.',
    grantCamera: 'Autoriser la caméra',
    openSettings: 'Ouvrir les réglages',
    processing: 'Pointage en cours…',
    successDefault: 'Pointage enregistré',
    successTitle: 'Pointage réussi',
    viewAttendance: 'Voir mon historique',
    scanAgain: 'Scanner un autre QR',
    eventCheckIn: 'Arrivée',
    eventCheckOut: 'Départ',
    eventBreakStart: 'Début de pause',
    eventBreakEnd: 'Reprise de pause',
    atKiosk: (name: string) => `Borne ${name}`,
    atBranch: (name: string) => `Site ${name}`,
    queuedOffline:
      'Hors ligne — pointage enregistré localement. Il sera synchronisé dès que la connexion revient.',
    scanError: 'Impossible de valider ce QR. Réessayez.',
    deviceNotTrusted:
      'Cet appareil n’est pas approuvé pour le pointage QR. Demandez une validation ou créez une réclamation.',
    syncSuccess: (n: number) =>
      n === 1
        ? '1 pointage hors ligne synchronisé'
        : `${n} pointages hors ligne synchronisés`,
    syncFailed: 'Certains pointages n’ont pas pu être synchronisés.',
    syncPending: (n: number) =>
      n === 1
        ? 'Synchroniser 1 pointage en attente'
        : `Synchroniser ${n} pointages en attente`,
    claimCta: 'Créer une réclamation de pointage',
    hint:
      'Placez le QR de la borne dans le cadre. En cas de problème réseau, le scan est mis en file et synchronisé plus tard (appareil approuvé requis).',
    a11yCamera: 'Viseur caméra pour scanner le QR de la borne',
    a11yStatus: (msg: string) => `Statut du pointage : ${msg}`,
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
    invalidDate: 'Date invalide',
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
    sectionPersonal: 'Compte',
    sectionActions: 'Pointage',
    sectionSchedule: 'Organisation',
    profile: 'Profil',
    profileDesc: 'Coordonnées et sécurité',
    attendance: 'Historique de pointage',
    attendanceDesc: 'Événements et méthodes',
    planning: 'Mon planning',
    planningDesc: 'Shifts à venir',
    leaveBalances: 'Soldes de congés',
    leaveBalancesDesc: 'Jours restants',
    leaveTypes: 'Types de congé',
    leaveTypesDesc: 'Catégories disponibles',
    breakResume: 'Reprise de pause',
    breakResumeDesc: 'Pointer la fin de pause',
    versionLabel: 'TimeGate Employé',
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
    noContractsHint: 'Vos contrats apparaîtront ici dès qu’ils seront publiés.',
    currentContract: 'Contrat en cours',
    pastContract: 'Ancien contrat',
    active: 'Actif',
    signedAt: 'Signé le',
    expiresAt: 'Expire le',
    viewPdf: 'Voir le PDF',
    sharePdf: 'Partager / enregistrer',
    openingPdf: 'Ouverture…',
    sharingPdf: 'Préparation…',
    shareError: 'Impossible de partager ce document',
    noPdf: 'Document non disponible',
  },

  messages: {
    title: 'Messages',
    menuDesc: 'Échanger avec votre manager',
    empty: 'Aucun message',
    emptyHint: 'Écrivez à votre manager pour une question RH ou opérationnelle.',
    new: 'Nouveau message',
    subject: 'Sujet',
    subjectPlaceholder: 'Ex. Question sur mon planning',
    body: 'Message',
    bodyPlaceholder: 'Décrivez votre demande…',
    send: 'Envoyer',
    reply: 'Répondre',
    replyPlaceholder: 'Votre réponse…',
    sending: 'Envoi…',
    you: 'Vous',
    manager: 'Manager',
    fillAll: 'Renseignez le sujet et le message',
    loadError: 'Impossible de charger les messages',
    sendError: 'Envoi impossible',
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