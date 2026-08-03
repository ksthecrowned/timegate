# TimeGate — Backlog produit & technique

> Fichier vivant : on y ajoute des entrées au fil de l'eau.  
> **Rien ici n'est un engagement d'implémentation immédiate** — c'est la vision consolidée et la file d'attente.

---

## Légende

| Statut | Signification |
|--------|---------------|
| `[ ]` | À faire |
| `[~]` | En cours |
| `[x]` | Terminé |
| `[—]` | Reporté / YAGNI pour l'instant |

| Priorité | Signification |
|----------|---------------|
| **P0** | Bloquant ou régression — à traiter en premier |
| **P1** | Socle produit — prochaine vague |
| **P2** | Valeur forte, peut attendre le socle |
| **P3** | Nice-to-have / maturité SaaS |

---

## Lots produit

| Lot | Nom | Priorité |
|-----|-----|----------|
| **—** | Bugs & dette technique (hors lot) | **P0** |
| **A** | Ops kiosk (provision, méthodes, feature flags) | **P1** |
| **B** | Pointage (fenêtres, QR, NFC, traçabilité) | **P1** |
| **C** | Hub identité employé | **P1** |
| **D** | Moteur notifications | **P1** |
| **I** | Mode SaaS & super-admin | **P1** |
| **E** | Politique temps & pause | **P2** |
| **F** | Employé self-service v2 | **P2** |
| **G** | Manager pro | **P2** |
| **—** | UX dashboard & config tenant (transverse) | **P2** |
| **H** | Conformité & intégrations | **P3** |

---

## Ordre d'exécution (vagues)

Les sections du fichier suivent cet ordre. Au sein d'une vague, traiter les lots dans l'ordre indiqué.

| Vague | Quand | Contenu | Sections |
|-------|-------|---------|----------|
| **1** | Immédiat | Stabilisation, régressions | [P0](#p0--bugs--dette-technique) |
| **2** | Socle | SaaS API + ops kiosk (parallélisable) | [I · phase 1](#lot-i--mode-saas--super-admin), [A](#lot-a--ops-kiosk) |
| **3** | Pointage cœur | Fenêtres horaires avant multi-méthodes | [B · fenêtres](#lot-b--fenêtres-de-pointage-shifttype) |
| **4** | Notifs + méthodes | Infra notifs, alertes pointage, QR/NFC, signup tenant | [D · pointage v1](#lot-d--moteur-notifications), [B · QR/NFC](#lot-b--multi-méthodes), [I · phase 2](#lot-i--phase-2--dashboard-tenant) |
| **5** | Identité + plateforme | Credentials employé, app super-admin | [C](#lot-c--hub-identité-employé), [I · phase 3](#lot-i--phase-3--app-super-admin) |
| **6** | RH avancé | Pauses, self-service, manager, UX | [E](#lot-e--politique-temps--pause), [G](#lot-g--manager-pro), [F](#lot-f--employé-self-service-v2), [UX](#p2--ux-dashboard--formulaires), [Config](#p2--configuration-tenant) |
| **7** | Maturité | Conformité, intégrations | [H](#lot-h--conformité-audit--intégrations) |

> **Dépendances clés** : fenêtres pointage (B) avant notifs retard/absence (D) · infra notifs (D) avant confirmations push (D) · SaaS guards (I·1) avant signup (I·2) · hub identité (C) après QR/NFC backend (B)

---

## P0 — Bugs & dette technique

**Vague 1** — avant ou en parallèle minimal des nouvelles features.

1. [x] **Suppression employé** — erreur 500 sur `DELETE /api/v1/employees/:id`
2. [x] **Approbation shift-swaps** — erreur 400 sur approbation `/shift-swaps` (cible obligatoire + UX)
3. [x] **Suppression horaire** — erreur 500 sur DELETE horaire type `E2E Horaire …`
4. [x] **Clé API kiosk** — `POST /kiosks/:id/regenerate-api-key` + affichage dashboard
5. [x] **SelectSearch** — audit (console.log, sync valeur async, instanceId shift-swaps, emplacement kiosk)
6. [x] **Confirm modal** — bug visuel (`z-[80]`)

### Questions / doc à clarifier

- [x] **Emplacement horaire** sur l'entité kiosque — voir [`docs/metier/planning-et-horaires.md`](docs/metier/planning-et-horaires.md)
- [x] **Plannings** — voir [`docs/metier/planning-et-horaires.md`](docs/metier/planning-et-horaires.md)

---

## Lot I — Mode SaaS & super-admin

**Priorité P1** · **Vagues 2, 4 et 5** · Brainstorming 2026-06-24 — spec design à rédiger plus tard.

### Décisions produit (validées)

| Sujet | Choix |
|-------|-------|
| Modèle commercial | Hybride : essai self-service + vente enterprise manuelle |
| Paiement | **Clés d'activation uniquement** — pas de Stripe / paiement auto |
| Durées | Flexibles par clé (3 mois, 12 mois, etc.) via `expiresAt` |
| Self-service | Page publique « Créer mon organisation » → essai auto **sans clé** |
| Conversion | Clé payante pour **prolonger** ou **upgrader** (`/activate`) |
| Super-admin | **App dédiée** `console/` — Console Plateforme (port 3002, `admin.timegate.app`) |
| Essai gratuit | Configurable plateforme ; **défauts** : 14 j / 10 emp / 1 kiosk / features RH de base |
| Expiration | **7 j grâce lecture seule** → puis **blocage total** (sauf login + `/activate`) |
| Plans payants | **Catalogue + override** — plans de base, quotas/durée ajustables pour enterprise |
| Stratégie livraison | **API d'abord** → dashboard tenant → app `console/` |

### Existant / lacunes

- [x] `TimeGateSubscription`, `TimeGateActivationKey`, `POST /auth/activate`
- [x] `SubscriptionActiveGuard`, super-admin intégré dans `dashboard/`
- [x] Quotas `maxEmployees` / `maxKiosks` appliqués à la création
- [x] Statuts intermédiaires (essai, grâce, lecture seule, bloqué, suspendu)
- [x] Inscription publique API (`POST /auth/signup`) · super-admin à extraire du dashboard

### Lot I — Phase 1 — API & modèle abonnement

**Vague 2**

#### Schéma & données

1. [x] **`PlatformSettings`** — singleton : défauts essai, durée grâce (défaut 7 j)
2. [x] **`SubscriptionPlan`** — catalogue (code, libellé, quotas, feature flags)
3. [x] **Statut abonnement** : `TRIAL` | `ACTIVE` | `GRACE_READ_ONLY` | `BLOCKED` | `SUSPENDED`
4. [x] Champs : `trialEndsAt`, `graceEndsAt`, `source` (`SELF_SIGNUP` | `ACTIVATION_KEY` | `MANUAL`)
5. [x] Lien clé → plan : `planId` sur `TimeGateActivationKey` + override optionnels

#### Endpoints & guards

6. [x] **`POST /auth/signup`** (public) — company + admin + subscription `TRIAL`
7. [x] **`GET /auth/subscription-status`** enrichi
8. [x] **`POST /auth/activate`** étendu (upgrade, prolongation, statut ACTIVE)
9. [x] **CRUD `/plans`**, **`GET/PATCH /platform-settings`**, **suspend org** (`PATCH /organizations/:id/suspension`)
10. [x] **`SubscriptionStateGuard`** + `@ReadOnlySubscriptionBypass` + `@AllowBlockedSubscription`
11. [x] **Quotas** employés & kiosks à la création
12. [x] **Job cron** — transitions auto + rappels J-7 / J-1 / jour J

### Lot I — Phase 2 — Dashboard tenant

**Vague 4** (après phase 1)

1. [x] **Page `/signup`** (publique)
2. [x] **Page `/activate`** enrichie + bandeau statut abonnement
3. [x] **`/subscriptions`** tenant en lecture seule
4. [x] **Retirer super-admin** du dashboard (`/super-admin/*`, `PlatformDashboard`, middleware)
5. [x] `CORS_ORIGIN` + docs — port 3002 (app `console/` phase 3)

### Lot I — Phase 3 — App `console/` (Console Plateforme)

**Vague 5**

1. [x] Scaffold `console/` — port 3002, auth `SUPER_ADMIN` only
2. [x] **Home** — KPI plateforme
3. [x] **Organisations** — liste, création enterprise, détail, suspendre
4. [x] **Plans** — CRUD catalogue
5. [x] **Clés d'activation** — plan + override durée (3 / 6 / 12 mois)
6. [x] **Paramètres plateforme**, **Abonnements** (vue globale)
7. [x] Migrer **audit logs**, **pays / villes** depuis dashboard
8. [x] Flux enterprise : créer org → clé payante → client active

### Notifications SaaS (lien Lot D)

- [x] Essai / grâce / expiration — rappels admin tenant
- [x] Quota employés / kiosks — alerte 80 % et 100 %

### Reporté — SaaS

- [—] Stripe / Mobile Money · achat clé en ligne · impersonation · white-label · facturation PDF

---

## Lot A — Ops kiosk

**Priorité P1** · **Vague 2**

1. [x] **1 kiosk = 1 appareil actif** — verrou strict sur `deviceToken` / provision
2. [x] **Feature flags serveur** — `GET /auth/mobile/config` + réponse provision
3. [x] **Config méthodes par kiosk** — visage / QR / NFC ; au moins une obligatoire
4. [x] **PIN = fallback uniquement** — seuils `pinFailureThreshold` / cooldown tenant
5. [x] **Alerte kiosk hors ligne** — cron `lastSeenAt` + heartbeat

---

## Lot B — Fenêtres de pointage (`ShiftType`)

**Priorité P1** · **Vague 3** — avant QR/NFC et notifs retard/absence

> Plages par **type d'horaire** ; employé = `defaultShift` ou assignment du jour. Ex. service 08h00–17h00.  
> **Brainstorming 2026-06-24 (pointage & pauses)** — machine à états ci-dessous.

### Décisions validées

| Règle | Comportement |
|-------|----------------|
| Arrivée (`CHECK_IN`) | Fenêtre configurable, ex. **07h00–12h00** |
| Arrivée après fin fenêtre | Enregistrée mais jour = **absent** |
| 2ᵉ scan avant fin fenêtre arrivée | Message *« Arrivée déjà enregistrée »* — pas de `CHECK_OUT` |
| Fin fenêtre sans pointage | **Absent** (cron) + notif manager |
| Pendant plage pause auto | Message *« Pause en cours »* — pas de `CHECK_OUT` |
| Reprise (`BREAK_END`) | Après fin plage pause et **avant** fin shift — 1er scan = reprise ; suivants = *« Reprise déjà enregistrée »* |
| Oubli de reprise | À partir de **fin shift** : 1 scan = **`CHECK_OUT` direct** + inférence `BREAK_END` à `breakWindowEnd` (pas de double scan) |
| Arrivée après `breakWindowEnd` | **Pas de reprise attendue** — prochain scan éligible = `CHECK_OUT` à partir de fin shift |
| Départ (`CHECK_OUT`) | **À partir de fin shift** uniquement, ex. **17h00** ; HS jusqu'à **00h00** |
| Départ anticipé | **Pas de flux kiosk** — refus avant fin shift ; **réclamation** employé + ajustement manuel admin (Lot F) |
| Hors plage | Refus + log tentative ; pas d'override kiosk (simplicité) |
| Pause | Plage **configurable par shift** ; **pause auto-déduite** (pas de `BREAK_START` quotidien) |
| Sans horaire employé | **Fallback horaire tenant** (shift / fenêtres par défaut) |
| Kiosk autre site | Pointage accepté → **`REVIEW_REQUIRED`** |
| Congé demi-journée | Pointage pendant plage couverte par congé approuvé → **`REVIEW_REQUIRED`** (fiche jour + calendrier) |
| « Pas pris ma pause » | **Réclamation** employé → ajustement admin (Lot F) |
| Offline (visage / NFC) | Résolution sur **`capturedAt`**, pas l'heure de sync — **PIN exclus** (online only) ; **QR** : challenge kiosk + file employee-app (sync TRUSTED) |
| Shift chevauche minuit | **Hors scope v1** — contrôles dédiés à ajouter plus tard |

### Cas limites — notes d'implémentation

- **Priorité fin shift (17h)** : avec oubli de reprise, pas d'ambiguïté reprise vs départ — le scan à partir de fin shift déclenche `CHECK_OUT` + inférence `BREAK_END` (une seule action côté employé).
- **Nuit / jour calendaire** : reporté ; documenter limitation v1 dans l'admin.

### Machine à états — interprétation d'un scan

> Remplace le toggle binaire actuel (`decideAttendance` : 2ᵉ scan = `CHECK_OUT`).

1. [x] **`PunchWindowService`** — résout shift du jour + fenêtres (`defaultShift` → `shiftAssignment` → `ShiftTypeWeekDay`)
2. [x] **`AttendancePunchResolver`** — déduit le type d'événement selon état du jour + heure (table + cas limites ci-dessus)
3. [x] **Inférence `BREAK_END`** à `breakWindowEnd` lors d'un `CHECK_OUT` sans reprise pointée
4. [x] **Skip reprise** si `CHECK_IN` > `breakWindowEnd`
5. [x] **Messages kiosk explicites** par cas (arrivée déjà faite, pause en cours, reprise, trop tôt pour départ)
6. [x] **Log tentative refusée** — `TimeGatePunchAttemptLog`
7. [x] Reprise pause : **employee-app prioritaire** + **fallback kiosk** (même règle `BREAK_END`)
8. [x] Employee-app : bouton reprise **actif dans périmètre** site uniquement (géoloc — voir Lot E)
9. [x] **Horaire fallback tenant** — si employé sans shift résolu (`TimeGateSystemSettings.defaultShiftType`)
10. [x] **Kiosk autre site** — flag `REVIEW_REQUIRED` sur l'événement
11. [x] **Offline** — machine à états sur `capturedAt` (file visage / NFC ; QR = file employee-app ; PIN online only)

### Schéma `ShiftType`

12. [x] `checkInWindowStart` / `checkInWindowEnd`
13. [x] `checkOutWindowStart` / `checkOutWindowEnd`
14. [x] `breakWindowStart` / `breakWindowEnd` + `breakDurationMinutes`
15. [x] Conserver `startTime` / `endTime` / `lateGraceMinutes` *(existant)*
16. [x] **UI admin fenêtres** — onglet « Fenêtres pointage » sur `/shift-types`
17. [x] **Périmètre géo site** (optionnel) — lat/lng + rayon pour reprise pause app

### Check-in sans check-out

18. [x] **Cron fin fenêtre départ** (00h30) — `UNCLOSED_CHECKIN` + `CHECKOUT_INFERRED`
19. [x] Flags `UNCLOSED_CHECKIN` + `CHECKOUT_INFERRED` — **pas d'événement `CHECK_OUT` synthétique**
20. [x] Jour → **`REVIEW_REQUIRED`** + inbox manager (Lot G)
21. [x] Rappel employé entre fin shift et minuit (Lot D)

### Absence automatique

22. [x] **Cron fin fenêtre arrivée** — sans `CHECK_IN` → `ABSENT` + `TimeGateAbsenceRecord`
23. [x] Notif manager (Lot D)

---

## Lot B — Multi-méthodes

**Priorité P1** · **Vague 4** — après fenêtres de pointage

### Traçabilité

1. [x] **`authMethod`** sur `TimeGateAttendanceEvent` (FACE | QR | NFC | PIN)
2. [x] Géolocalisation optionnelle au pointage *(lat/lng optionnels + contrôle périmètre si fournis)*

### QR-code

3. [x] **Pointage QR inversé** — kiosk affiche challenge `TGQR:v3` ; employee-app scanne (`POST /employee/qr-punch/scan`)
4. [x] **Challenge kiosk** — secret borne + slot HMAC 45 s ; poll résultat kiosk
5. [x] **QR offline** — file employee-app + `POST /employee/qr-punch/sync` (TRUSTED au sync)

### NFC

6. [x] **Backend `POST /auth/mobile/verify-nfc`** — kiosk avec `react-native-nfc-manager`
7. [x] **Enregistrement carte NFC** — UID ↔ employé (`PATCH /employees/:id/nfc-badge`)
8. [x] **Pointage NFC offline** — résolution sur `capturedAt` (comme visage)
9. [x] **PIN kiosk** — **online uniquement** (pas de file offline)
10. [x] **QR kiosk** — affichage challenge (mode Pointage QR) ; offline via employee-app

---

## Lot C — Hub identité employé (admin)

**Priorité P1** · **Vague 5** — après backends QR/NFC (B)

Écran unifié `/employees/:id` :

1. [x] **Identité QR** — plus de secret QR personnel ; pointage via scan challenge kiosk (Lot B)
2. [x] **Carte NFC** — UID, émission, révocation
3. [x] **Profil facial** — enroll, re-enrôlement
4. [x] **PIN kiosk** — regrouper (`EmployeeKioskPinCard`)
5. [x] **Compte utilisateur lié** — `User` par employé
6. [x] **Statut « peut pointer »** — oui/non + raison

---

## Lot D — Moteur notifications

**Priorité P1** · **Vague 4** (infra) puis extensions **vague 6**

> Pointage v1 : confirmations employé + alertes anomalies (décision D).

### Infrastructure (vague 4 — en premier)

1. [x] Modèle **`TimeGateNotification`** — `userId`, `type`, `title`, `body`, `readAt`, `meta` (+ `timegate_device` push)
2. [x] **`NotificationRule`** par tenant — API `/notifications/rules` + UI `/organization/notification-rules`
3. [x] **`GET /notifications`**, `PATCH read` / `read-all` · `POST/GET /devices/register`
4. [x] **`NotificationRecipientResolver`** — managers proximité ∪ tous `MANAGER`/`ADMIN` du tenant, dédoublonnage
5. [x] Job émetteur — cron + hooks post-pointage (`auth.service`, `PunchCronService`)
6. [x] **Inbox dashboard** — cloche + Web Push FCM (`Navbar`, `WebPushSetup`)
7. [x] **Push FCM** — `employee-app` (`@react-native-firebase/messaging`) + fallback Expo Push dev

### Notifications de pointage — v1 (vague 4 — après infra + fenêtres B)

#### Confirmations employé

8. [x] **CHECK_IN** / **CHECK_OUT** / **BREAK_*** — push + in-app
9. [x] **REVIEW_REQUIRED** — « en attente validation manager » (employé + managers)

#### Alertes anomalies

10. [x] **Retard** — employé + manager
11. [x] **Absence auto** (cron fin fenêtre arrivée) — manager
12. [x] **Départ non pointé** — rappel employé (fin shift → minuit) ; manager notifié si cron `UNCLOSED_CHECKIN` (00h30)
13. [x] **REVIEW_REQUIRED** — rappel validateur (relance manager, cron 9h, > 24 h)
14. [x] **Pause trop longue** · **HS > seuil** · **tentative hors plage** (optionnel) — `BREAK_OVERRUN` + `OVERTIME_THRESHOLD` + `PUNCH_OUTSIDE_WINDOW`

### Autres domaines (vague 6)

- [x] RH : contrat expire, essai SaaS, document manquant
- [x] Calendrier : congé en attente (manager), décision congé (employé)
- [x] Ops : kiosk offline, échecs verify, solde bas — offline + verify spikes + low leave balance
- [x] **Email** (optionnel par règle) — `NotificationRule.emailEnabled` + envoi SMTP (fallback log dev)

---

## Lot E — Politique temps & pause

**Priorité P2** · **Vague 6** · Brainstorming 2026-06-24

### Décisions validées

| Sujet | Choix |
|-------|-------|
| Pause quotidienne | **Auto-déduite** sur plage shift (`breakWindow` + `breakDurationMinutes`) — pas de `BREAK_START` obligatoire |
| Reprise pause | **`BREAK_END`** — employee-app **prioritaire**, kiosk en fallback ; 1er scan après fin plage pause = reprise |
| Géoloc reprise (app) | Bouton reprise **désactivé hors périmètre** entreprise ; marge rayon configurable par site |
| Pause trop longue | `durée_réelle − durée_autorisée` → **déduite** du timesheet (surplus non payé) |
| Sans reprise pointée | Pause auto seule ; litige → réclamation + admin (comme départ anticipé) |

### Backlog

1. [x] Fenêtres pointage & pause — voir [Lot B](#lot-b--fenêtres-de-pointage-shifttype) *(réalisé via Lot B #1-17)*
2. [x] **Calcul pause** — auto baseline + ajustement si `BREAK_END` pointé après fin plage
3. [x] **Déduction surplus pause** dans `TimesheetsService` + flag anomalie `BREAK_OVERRUN`
4. [x] **Employee-app** — écran « Reprendre la pause » + géoloc (permission + état bouton)
5. [x] **Seuils heures sup** + alertes `OVERTIME_THRESHOLD` (recalcul timesheet)
6. [x] **Règles d'arrondi** — 5 / 15 min (tenant `timesheetRoundingMinutes`)
7. [x] **Tolérance retard** · **temps min entre shifts** — `lateThreshold` + `minMinutesBetweenShifts` + flag `INSUFFICIENT_REST`

---

## Lot G — Manager pro

**Priorité P2** · **Vague 6** — inbox `REVIEW_REQUIRED` (brainstorming 2026-06-24)

1. [x] **Vue équipe du jour** — présents / absents / retard / pause
2. [x] **Validation en masse** `REVIEW_REQUIRED`
3. [x] **Inbox approbations** — congés + swaps + **réclamations pointage** + **check-out oublié** (`UNCLOSED_CHECKIN`)
4. [x] **Fiche validation check-out oublié** — heures inférées, réclamation employé liée, actions : valider / corriger / rejeter
5. [x] **Calendrier congés équipe** (roadmap #37)
6. [x] **Rapport anomalies hebdo** par email

---

## Lot F — Employé self-service v2

**Priorité P2** · **Vague 6**

1. [x] **Upload justificatif congé** — multipart `POST /employee/leaves` + R2
2. [x] **Push notifications** — pointage v1 OK (Lot D) ; congés approuvé/refusé + demande manager
3. [x] **Pointer par QR** — scan challenge kiosk (`/qr-punch`), offline queue + sync TRUSTED
4. [x] **Voir ses contrats** + PDF — `GET /employee/contracts`, écran `/contracts`
5. [x] **Historique pointages** — `GET /employee/attendance-events` (méthode, kiosk, statut)
6. [x] **Réclamation pointage** — types + motif ; inbox manager + fiche `/punch-claims/:id`
7. [x] **Reprise de pause** — bouton `BREAK_END` (géoloc : actif sur site uniquement)
8. [x] **Mes alertes** — notifs push ; rappel départ + **reprise pause** (`BREAK_RESUME_REMINDER`)
9. [x] **Auth biométrique OS** — `expo-local-authentication` + login biométrique optionnel

### Polish app employé (ex-`totos.md`)

10. [x] Accueil contextuel, branding TimeGate, empty/error states, dark mode, date pickers natifs
11. [x] Hiérarchie CTA, feedback post-pointage, deep-links notifs, offline explicite, a11y login/QR/pause
12. [x] Docs/contrats PDF, messagerie, quick actions Android, onboarding appareil de confiance, analytics funnels
13. [ ] **Unifier `useTheme()`** sur les écrans restants
14. [ ] **Harmoniser labels a11y FR** (`STRINGS.a11y`) sur tous les écrans restants
15. [—] E2E UI (Playwright) — **YAGNI** : auto réservée à l’API (`test:use-cases`) ; front = manuel / pilote

---

## P2 — UX dashboard & formulaires

**Vague 6**

1. [x] **Sélecteur pays** — phone international (hint + placeholder pays)
2. [x] **Sélection nationalité** — UX employé (`SelectSearch` pays)
3. [x] **Sélecteur de date** — navigation entre années (`DatePicker` dropdown years)
4. [x] **Renommage routes UI** `/timegate/*` (cosmétique, #31)
5. [x] **Hints formulaires** — tooltips icône (`HintTooltip`, `FormField`, paramètres pointage, fenêtres horaires)

---

## P2 — Configuration tenant

**Vague 6**

1. [x] Méthodes de pointage par défaut (héritées par kiosk) — `defaultFace/Nfc/QrEnabled`
2. [x] **Horaire / fenêtres fallback** — `/organization/attendance-settings`
3. [x] Seuils échecs avant PIN (tenant) · [x] confiance faciale, tolérance retard (super-admin `/system-config`)
4. [x] **Règles pause & heures sup** — arrondi, seuil HS, repos min. (`/organization/attendance-settings`)
5. [x] Délais notifications — relance checkout / review manager paramétrables
6. [x] Politique offline (file d'attente kiosk) — allow + ancienneté max sync

---

## Lot H — Conformité, audit & intégrations

**Priorité P3** · **Vague 7**

1. [x] **Journal d'audit enrichi** — contexte branche + metadata (review/override/offline/password)
2. [x] **Export légal période** — PDF horodaté + empreinte SHA-256 + audit log
3. [x] **Rétention photos faciales** (RGPD) — purge auto + suppression R2 + logs conservés
4. [x] **Webhooks** — endpoint tenant + signature HMAC + émission `notification.emitted`
5. [x] **API publique documentée** — Swagger `/api/v1/docs` + guide `api/docs/public-api.md`
6. [ ] **Intégration SIRH** — connecteurs / mapping employés·congés·présences vers un SIRH tiers (Lucca, Factorial, etc.) via API publique + webhooks ; **pas prioritaire** tant que le pilote terrain n’est pas validé (noté 2026-07-27)

---

## Reporté — YAGNI

- [—] Rotations auto de planning · multi-validateurs · marketplace shifts
- [—] Shift **chevauche minuit** (nuit) — contrôles dédiés v2
- [—] Géofencing **général** (pointage hors site) · facial externe · QR comme mode principal  
  - *Exception validée : géoloc **reprise pause** employee-app uniquement (Lot E)*
- [—] Stripe · impersonation · white-label (voir Lot I)
- [—] E2E UI Playwright (dashboard / apps) — auto = API seulement

---

## Références

| Document | Contenu |
|----------|---------|
| `api/docs/roadmap-1.2.0.md` | Capacités API déjà livrées (synthèse) |
| `api/docs/api-json-shapes.md` | Formes JSON API v1 |
| `docs/superpowers/specs/` | Specs design validées |
| `docs/metier/positionnement-marche.md` | Positionnement vs Lucca / UKG / bornes (ex-`totos.md`) |
| Brainstorming 2026-06-24 | Multi-méthodes, notifications, pauses, SaaS |
| Brainstorming 2026-06-24 (pointage) | Machine à états, pauses, check-out oublié, réclamations — consolidé dans lots B, E, F, G, D |

---

## Comment ajouter une entrée

1. Identifier la **vague** et le **lot** (tableau ci-dessus).
2. Placer l'item dans la section du lot, **après les dépendances** déjà listées.
3. Une ligne = une **unité livrable** testable.
4. Préfixer `[ ]` ; numéroter si ordre d'exécution au sein du lot est important.
5. Les idées floues : suffixe `(à préciser)`.

<!-- Dernière mise à jour : 2026-06-28 — Lot I phase 1 API SaaS (signup, guards, quotas, cron) -->
