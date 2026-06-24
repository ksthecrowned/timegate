# TimeGate — Migration `employee-web/` → `employee-app/` (Expo) — Design

**Date** : 2026-06-22
**Sous-projet** : #1 d'une réstructuration plus large (voir section "Hors scope")
**Statut** : design proposé, en attente d'approbation

---

## Contexte

Le repo TimeGate est un système de pointage intelligent par reconnaissance faciale. Aujourd'hui les employés utilisent `employee-web/` (Next.js mobile-first) pour consulter leurs pointages, soldes de congés, planning, et soumettre des demandes de congé.

L'objectif est de remplacer cette webapp par une **vraie app native distribuée** (Expo / React Native), distribuée via App Store et Play Store, avec notifications push, biométrie OS, et présence sur l'écran d'accueil.

Ce design s'aligne sur les patterns éprouvés du projet `D:\ride-client` (même auteur, stack Expo SDK 54 / expo-router 6 / TypeScript strict). Les fichiers `services/api/client.ts`, `config/SecureStorage.ts`, `services/notifications.ts`, `context/AuthContext.tsx` et `components/PushNotificationSetup.tsx` sont repris quasi tels quels, adaptés au domaine "employé" de TimeGate.

`employee-web/` reste en place le temps de la migration, puis est déprécié (banner) puis supprimé.

## Approche retenue

**Approche A — Réécriture from scratch en Expo Router.**

On crée un nouveau dossier `employee-app/` avec :
- Expo SDK 54, expo-router 6, React 19.1, React Native 0.81.5
- TypeScript strict, alias `@/*` → racine
- File-based routing avec groupes `(auth)/` et `(tabs)/`
- Push via FCM (`@react-native-firebase/messaging`), aligné sur ride-client

On étend l'API NestJS existante avec 4 endpoints. Pas de nouvelle API, pas de shell WebView.

## Portée v1

**Inclus** :
- Auth : login (email/password), forgot password, reset password, refresh token, logout
- Persistance tokens via `expo-secure-store` (avec fallback AsyncStorage si > 2048 bytes)
- 5 onglets : Pointages, Congés, Planning, Notifications, Profil
- Lecture : pointages du jour + semaine, soldes congés, mes shifts, profil
- Écriture : demande de congé avec upload justificatif
- Détail : leave/[id], shift-swap/[id]
- Push FCM (réception + tap routing)
- Deep links `timegate://...`

**Exclus de v1** (YAGNI) :
- Mode hors-ligne (cache local, NetInfo, offline queue)
- Auth biométrique (Face ID / Touch ID)
- Géofencing, widgets iOS/Wear OS
- Internationalisation (fr uniquement)
- Paiement / e-commerce (non applicable au domaine employé)

**Sous-projets séparés à venir** (hors scope) :
- #2 : renommage `mobile-app/` → `kiosk-app/` + features manquantes
- #3 : création `super-admin/` (SaaS admin)

---

## Architecture cible

### Arborescence `employee-app/`

```
employee-app/
  app/
    _layout.tsx                        # providers globaux + Stack racine
    index.tsx                          # redirect selon auth
    (auth)/
      _layout.tsx                      # Stack auth
      login.tsx
      forgot-password.tsx
      reset-password.tsx
    (tabs)/
      _layout.tsx                      # Tabs (AuthGate wrapper)
      index.tsx                        # Pointages
      leaves.tsx                       # Soldes + demandes
      planning.tsx                     # Mes shifts
      notifications.tsx                # Inbox
      profile.tsx                      # Profil + paramètres
    leave/
      new.tsx                          # Form demande
      [id].tsx                         # Détail
    shift-swap/
      [id].tsx                         # Détail échange
  components/
    auth/
      AuthGate.tsx                     # redirige vers /(auth)/login si non auth
      AuthShell.tsx
      AuthFieldError.tsx
      PasswordTextInput.tsx
    attendance/
      TodayCard.tsx
      WeekStrip.tsx
      PunchTimeline.tsx
    leaves/
      BalanceCard.tsx
      RequestListItem.tsx
    planning/
      ShiftListItem.tsx
      WeekNavigator.tsx
    profile/
      ProfileHeader.tsx
      ProfileSection.tsx
    ui/
      Button.tsx
      Card.tsx
      Field.tsx
      EmptyState.tsx
      ErrorState.tsx
      StatusBadge.tsx
    PushNotificationSetup.tsx
  config/
    SecureStorage.ts                   # reprise ride-client
    authStorage.ts                     # setAuthTokens / getAccessToken / getRefreshToken
  constants/
    api.ts                             # API_BASE_URL via EXPO_PUBLIC_API_URL
    storageKeys.ts                     # TIMEGATE_*_TOKEN
    theme.ts                           # couleurs + typo
  context/
    AuthContext.tsx                    # signIn / signOut / refreshUser / restoreSession
  hooks/
    usePushTokenSync.ts
  services/
    api/
      client.ts                        # fetch + refresh + ApiError (reprise ride-client)
      auth.service.ts                  # /auth/employee/login, /me, /refresh, /logout
      attendance.service.ts            # /attendance/me
      leaves.service.ts                # /leaves/balances/me, /leaves/requests
      planning.service.ts              # /planning/shifts/me, /shift-swaps/me
      profile.service.ts               # /employees/me
      push.service.ts                  # /devices/register, /devices/remove
    notifications.ts                   # registerForPushNotificationsAsync (FCM prioritaire)
    pushLogout.ts
  types/
    auth.ts
    attendance.ts
    leaves.ts
    planning.ts
    profile.ts
    api.ts                             # ApiError, ApiEnvelope, ApiPaginationMeta
  utils/
    postAuthNavigation.ts
    leaveDisplay.ts
    attendanceDisplay.ts
    pushRouting.ts
    phone.ts                           # si besoin futur (non utilisé v1)
  assets/
    fonts/                             # Comfortaa ou Inter
    images/                            # logo, splash, icônes
  app.json
  tsconfig.json
  eas.json
  package.json
  GoogleService-Info.plist             # Firebase iOS (gitignored, .example commited)
  google-services.json                 # Firebase Android (gitignored, .example commited)
  expo-env.d.ts
```

### API NestJS — modules ajoutés

**`api/src/auth/employee-auth/`** (refactor de l'existant pour aligner sur le pattern ride-client)
- `POST /auth/employee/login` — existe déjà, on s'assure qu'il retourne `{ accessToken, refreshToken, user }`
- `POST /auth/employee/refresh` — nouveau, rotation de tokens
- `POST /auth/employee/logout` — nouveau, révoque le refresh token
- `GET /auth/employee/me` — existe, on garde

**`api/src/devices/`** (nouveau module)
- `Device` model Prisma : `id, employeeId, token, platform, lastSeenAt, isActive, createdAt`
- `POST /devices/register` — `{ token, platform }`, upsert + `isActive = true`
- `POST /devices/remove` — `{ token }`, `isActive = false`
- `GET /devices` — liste des devices de l'employé connecté (debug)
- Migration : `add_devices_table`

**`api/src/notifications/`** (nouveau module)
- `firebase-admin.module.ts` — init Firebase Admin (credentials via env var)
- `firebase-admin.service.ts` — `sendToToken(token, payload)` via Firebase Admin SDK
- `notifications.service.ts` — `sendToEmployee(employeeId, payload)` : récupère les devices actifs, choisit transport (FCM si token FCM, Expo Push si préfixe `ExponentPushToken[`)
- `push.controller.ts` (admin) — `POST /admin/notifications/send` (debug, hors scope v1)

---

## Data flow

### Client HTTP (`services/api/client.ts`)

Reprise quasi conforme de `D:\ride-client\services\api\client.ts` :
- Fetch natif + `AbortController` (timeout 30s, refresh timeout 15s)
- Refresh in-flight dedup : une seule promesse `doRefresh` à la fois
- Auto-refresh sur 401 : `requireAuth: true` + 401 → `doRefresh()` → retry
- `attachAuthIfAvailable` : envoie le JWT s'il est présent (utile pour endpoints publics optionnellement authentifiés)
- `ApiError` typé : `code ∈ {NETWORK_ERROR, TIMEOUT, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, SERVER_ERROR, UNKNOWN_ERROR}` + `statusCode` + `originalError`
- Enveloppe `ApiEnvelope<T> = { statusCode, message, data, meta }`, unwrap automatique
- `setOnSessionExpired(fn)` : hook global pour redirection auto

**Adaptations** :
- Préfixe storage : `ride_` → `timegate_`
- Endpoints `auth/employee/*` au lieu de `auth/consumers/*` / `auth/*`
- Pas de `consumerMe` (concept ride-client non applicable)

### Auth flow (`context/AuthContext.tsx`)

```
mount
  → restoreSession()
      → si accessToken → fetch /auth/employee/me
      → sinon si refreshToken → doRefresh() → si OK fetch /me
      → sinon → { user: null }
  → setUser / isLoading = false

signIn(accessToken, refreshToken, user)
  → setAuthTokens(...)
  → fetch /employees/me → setEmployeeProfile

signOut()
  → unregisterPushOnLogout()      // POST /devices/remove
  → POST /auth/employee/logout    // revoke refresh
  → clearAuthTokens()
  → setUser(null), setEmployeeProfile(null)
  → router.replace('/(auth)/login')

refreshUser()
  → fetch /auth/employee/me + /employees/me → setState

setOnSessionExpired (côté client.ts) :
  → si refresh rate au milieu d'une requête
  → AuthContext catch → signOut() auto + redirect
```

### Push flow (`components/PushNotificationSetup.tsx`)

Reprise exacte du pattern ride-client (FCM prioritaire) :

```
mount
  → si authenticated && !guest && user.id
    → registerForPushNotificationsAsync()
        → permissions (iOS : alert+badge+sound)
        → getToken(messaging)        // FCM
        → fallback Notifications.getDevicePushTokenAsync()
    → POST /devices/register { token, platform }
    → syncKey = `${user.id}:${Platform.OS}:${token}` (no re-register)
  → AppState.addEventListener('change', state==='active' → re-sync)

foreground
  → Notifications.addNotificationReceivedListener → echo local
  → onMessage(messaging, remoteMessage) → echo local

tap
  → useLastNotificationResponse
    → persistIncomingNotification
    → navigateFromPushData(data) via utils/pushRouting
    → default : /notifications
```

**Transport** : l'API détecte le préfixe du token et choisit :
- `ExponentPushToken[...]` → Expo Push Service (`https://exp.host/--/api/v2/push/send`)
- Sinon → Firebase Admin SDK

Les deux populations coexistent, utile pendant la transition Expo Go → build natif.

### `app/(tabs)/index.tsx` — Pointages (écran d'accueil)

- Header : "Bonjour [Prénom]", date du jour en français
- Carte "Aujourd'hui" : heure arrivée / heure départ / heures travaillées
- Timeline des pointages (entrées/sorties)
- Section "Cette semaine" : 7 jours, total heures + statut
- Pull-to-refresh
- Empty state si aucune donnée
- Erreur : `ErrorState` avec bouton "Réessayer"

**Data** : `GET /attendance/me?date=YYYY-MM-DD` + `GET /attendance/me?from=...&to=...` (semaine).

### `app/(tabs)/leaves.tsx` — Congés

- Carte "Soldes" : grille 2x2 (Congés payés / RTT / Maladie / Sans solde), barre de progression
- Liste "Demandes" : chronologique inverse, badge statut
- FAB → `/leave/new`

**Data** : `GET /leaves/balances/me` + `GET /leaves/requests/me`.

### `app/(tabs)/planning.tsx` — Planning

- Sélecteur de semaine (◀ ▶)
- Liste des shifts : heure début/fin, poste, lieu
- Indicateur "Échange proposé" sur les shifts avec proposition en attente

**Data** : `GET /planning/shifts/me?from=...&to=...` + `GET /shift-swaps/me?status=pending`.

### `app/(tabs)/notifications.tsx` — Inbox

- Liste : push reçus + in-app
- Badge non-lus
- Tap : détail + `POST /notifications/[id]/read`

### `app/(tabs)/profile.tsx` — Profil

- Photo (initiale) + nom + email + rôle
- Infos read-only (matricule, département, poste, manager)
- Toggle "Notifications push"
- Bouton "Se déconnecter" (avec confirmation)

### `app/leave/new.tsx` — Demande de congé

- Type (Select depuis `GET /leave-types`)
- Date début / Date fin (DatePicker, fin ≥ début)
- Motif (TextInput, requis pour "Autre")
- Justificatif (ImagePicker, requis pour Maladie)
- Submit : `POST /leaves/requests` (multipart avec fichier) → `router.back()` + toast

### `app/leave/[id].tsx` & `app/shift-swap/[id].tsx`

Écrans de détail read-only : header récap, timeline décision, actions contextuelles.

### Deep links & push routing

Scheme : `timegate://` (configuré dans `app.json`).

| `data.kind`          | Route interne               |
|----------------------|-----------------------------|
| `leave.approved`     | `/leave/[id]`               |
| `leave.rejected`     | `/leave/[id]`               |
| `shift.changed`      | `/planning`                 |
| `shift.swap.request` | `/shift-swap/[id]`          |
| _(default)_          | `/notifications`            |

### Permissions natives

| Permission                       | Plateforme | Usage                       |
|----------------------------------|------------|-----------------------------|
| Notifications                    | iOS + Android | Push événements RH       |
| Photos (lecture)                 | iOS + Android | Justificatif de congé    |
| Caméra                           | iOS + Android | Justificatif photo directe |
| Face ID / Touch ID               | iOS + Android | Hors scope v1            |

Caméra demandée uniquement si l'utilisateur choisit "Prendre une photo" sur le justificatif.

---

## Stratégie de migration

### Phase 0 — Préparation
- API : 4 endpoints ajoutés + migration Prisma `Device`
- Projet Firebase créé, credentials Admin SDK stockés en env var
- Documentation de l'enveloppe API commune

### Phase 1 — Bootstrap `employee-app/`
- `npx create-expo-app employee-app --template default`
- Copie config ride-client : `tsconfig.json`, `app.json`, `SecureStorage.ts`, `client.ts`, `authStorage.ts`, `AuthContext.tsx`, `notifications.ts`, `PushNotificationSetup.tsx` (adaptation `ride_` → `timegate_`)
- Brancher Firebase
- Login + forgot/reset password fonctionnels contre API dev

### Phase 2 — Écrans v1
- Tab bar + 5 onglets + AuthGate
- Login + forgot/reset
- 5 onglets avec données
- Détail `leave/[id]` et `shift-swap/[id]`
- Form `leave/new` avec upload

### Phase 3 — Push
- `PushNotificationSetup` côté app
- `notifications.service.ts` côté API (Firebase Admin + Expo Push fallback)
- Test E2E : approbation congé côté dashboard → push reçu

### Phase 4 — Beta interne
- EAS Build `preview`
- Distribution : TestFlight + Firebase App Distribution
- 5-10 testeurs (multi-sites, multi-plateforme)

### Phase 5 — Déploiement store
- EAS Build `production`
- EAS Submit → App Store + Play Store
- Déprécier `employee-web/` (banner "Cette version n'est plus maintenue")
- Suppression complète 2 releases plus tard

**Rollback** : à tout moment on peut re-basculer les employés sur `employee-web/` via un flag côté dashboard (deep-link + flag session). La migration est non-destructive tant que les deux frontends consomment la même API.

---

## Tests

### Unit (Jest + React Native Testing Library)
- `services/api/client.ts` : refresh dedup, 401, timeout, ApiError
- `context/AuthContext.tsx` : restoreSession, signIn, signOut, setOnSessionExpired
- `config/SecureStorage.ts` : fallback AsyncStorage > 2048 bytes
- `utils/pushRouting.ts`, `utils/leaveDisplay.ts`, `utils/attendanceDisplay.ts`

### Integration (RNTL + MSW)
- `app/(auth)/login.tsx` : validation, submit OK, submit KO
- `app/(tabs)/index.tsx` : empty state, error state
- `app/leave/new.tsx` : validation dates, upload, submit multipart
- `app/(tabs)/leaves.tsx` : soldes, navigation

### E2E (Detox ou Maestro)
- Parcours : login → pointages → demande congé → déconnexion
- Push : envoi via Firebase Admin (script seed) → inbox
- Pas d'E2E offline (hors scope v1)

### API (côté `api/`)
- Réutiliser `api/scripts/test-use-cases.mjs` (existant)
- Couvrir : login/refresh/logout, register/remove device, send push (mocké)

### Smoke tests manuels
- iOS device + Android device : login, navigation, push, déconnexion
- TestFlight + Firebase App Distribution

---

## Déploiement

### CI (`.github/workflows/ci.yml`)

Étendre le job `frontend` existant :
- Ajouter `employee-app/` au `tsc --noEmit`
- Job `employee-app:lint` (`eslint`)
- Job `employee-app:test` (Jest)

### EAS Build (`eas.json`)

```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview":     { "distribution": "internal" },
    "production":  {}
  },
  "submit": {
    "production": { "ios": { "ascAppId": "..." }, "android": { "package": "..." } }
  }
}
```

### Environments

- `EXPO_PUBLIC_API_URL` :
  - dev : `http://localhost:4001/api/v1`
  - staging : `https://api-dev.timegate.app/api/v1`
  - prod : `https://api.timegate.app/api/v1`
- Schéma : `timegate-dev` / `timegate-staging` / `timegate`
- Bundle IDs : `cg.sotrafer.timegate.dev` / `cg.sotrafer.timegate` (à confirmer)

### OTA Updates (EAS Update)
- Canal `production` pour fixes JS urgents
- Pas d'OTA pour changements natifs (push permission, FCM) → rebuild obligatoire

### Monitoring
- Sentry : `@sentry/react-native` + `expo-sentry`
- Logs : `console.*` en dev, Sentry breadcrumbs en prod

---

## Critères de succès v1

- [ ] Login + refresh + logout fonctionnent sur iOS + Android
- [ ] 5 onglets naviguent et affichent les données depuis l'API
- [ ] Demande de congé avec upload fonctionne end-to-end
- [ ] Push reçu lors d'une approbation côté dashboard
- [ ] Tests unit + integration verts en CI
- [ ] E2E smoke test passe
- [ ] Soumis à TestFlight et Firebase App Distribution
- [ ] `employee-web/` affiche un banner de dépréciation

## Risques

| Risque | Mitigation |
|---|---|
| FCM credentials manquants ou expirés | Documenter la procédure de rotation, alerte avant expiration |
| `expo-secure-store` > 2048 bytes sur Android | Fallback AsyncStorage déjà en place (reprise ride-client) |
| Push iOS refusés par l'utilisateur | Détection + bandeau "Activez les notifications" + lien Réglages |
| Upload de gros fichiers (justificatifs) | Compression `expo-image-picker quality: 0.7` + limite API 5MB |
| `employee-web/` toujours en prod pendant la migration | Flag côté dashboard, bascule progressive par organisation |

---

## Hors scope v1 (sous-projets brainstormables suivants)

- #2 : renommage `mobile-app/` → `kiosk-app/` + features manquantes
- #3 : création `super-admin/` (SaaS admin)
- Auth biométrique (`expo-local-authentication`)
- Géofencing, widgets iOS/Wear OS
- Internationalisation (en)
- Mode hors-ligne (cache local, NetInfo, offline queue) — explicitement exclu par décision utilisateur
