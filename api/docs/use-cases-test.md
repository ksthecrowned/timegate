# Cas d’usage de test — TimeGate

Guide de test manuel bout en bout pour l’API et le dashboard (`dashboard`), aligné sur les données du seed démo.

## Prérequis

```bash
# API
cd api && bun install && bun run prisma:migrate && bun run prisma:seed && bun run start:dev

# Dashboard
cd dashboard && bun install && bun run dev
```

| Service        | URL                              |
|----------------|----------------------------------|
| Dashboard      | http://localhost:3000            |
| Espace employé | http://localhost:3001            |
| API            | http://127.0.0.1:4001/api/v1     |

### Tests API automatisés (CI)

```bash
cd api
bun run prisma:migrate && bun run prisma:seed && bun run start:dev   # terminal 1
bun run test:use-cases                                               # terminal 2
```

Le script [`../scripts/test-use-cases.mjs`](../scripts/test-use-cases.mjs) couvre les UC-01 à UC-13 côté API. Les parcours **dashboard** et **employee-web** sont complétés par les tests Playwright (voir ci-dessous).

### Tests e2e Playwright (CI)

```bash
# Terminaux requis : API (4001), dashboard (3000), employee-web (3001)
cd e2e && npm install && npx playwright test
```

Couverture minimale : profil dashboard, export présences CSV/PDF, KPI accueil, profil employee-web, manifest PWA.

Requêtes HTTP d’exemple : [`../EXAMPLES.http`](../EXAMPLES.http).

---

## Comptes et données seed

**Mot de passe commun :** `ChangeMe123!`

| Rôle        | Email                           | SKU org. |
|-------------|----------------------------------|----------|
| ADMIN       | `admin@monorganisation.com`      | `SOTR`   |
| MANAGER     | `manager@monorganisation.com`    | `SOTR`   |
| SUPER_ADMIN | `superadmin@monorganisation.com` | *(aucun)* |
| Employé     | `patrick.mukendi@sotrafer.cg` | *(app `employee-web` port 3001)* |

**Organisation :** SOTRAFER Congo (`SOTR`) — entreprise logistique, République du Congo (seed)

**Branches :** Siège Poto-Poto (Brazzaville), Antenne Pointe-Noire

**Employés démo :** Patrick Mukendi et collègues (téléphones +242)

**PIN kiosk démo :** Patrick Mukendi — PIN `1234` (ID employé sur sa fiche dashboard)

**Logo organisation :** `/images/orgs/sotrafer-logo.svg` — configurable via **Organisation → Configuration**

**Données pré-chargées :**

- Contrat CDI sur Patrick Mukendi (expire dans ~2 mois, `isCurrent: true`)
- Types de congé : Annual Leave (22 j/an), Sick Leave (10 j/an, sans solde)
- Liste fériés : « TimeGate Demo Holidays »
- ~45 jours ouvrés de présence, feuilles de temps, retards et absences par employé
- Événements de pointage (7 derniers jours) via kiosques HQ / West
- Paie mois précédent : **PAYÉE** ; paie mois courant : **BROUILLON**
- Kiosques : Kiosque Brazzaville, Kiosque Pointe-Noire (géolocalisation sur la branche)
- Fériés : calendrier République du Congo (15 août, 28 novembre, etc.)

Après `prisma:seed`, les identifiants créés sont affichés dans la console (`company`, `kioskHq`, `payrollRuns`, etc.).

---

## UC-01 — Connexion et rôles

**Automatisé CI :** partiel (login ADMIN/MANAGER/SUPER_ADMIN, mauvais MDP, restrictions API) — menus dashboard : manuel

**Objectif :** vérifier l’accès par rôle dans le dashboard.

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Connexion ADMIN (`admin@…`, SKU `SOTR`) | Menu complet : RH, Présence, Paie, Administration SaaS |
| 2 | Déconnexion → connexion MANAGER | Pas d’accès Paie, Types de congé, Utilisateurs |
| 3 | Connexion SUPER_ADMIN | Tableau de bord **stats plateforme** ; menu **Plateforme SaaS** uniquement (pas de données RH client) |
| 3b | SUPER_ADMIN → Pays | Liste, ajout, modification, suppression (ex. `CG` — République du Congo) |
| 3c | SUPER_ADMIN → Villes | Liste filtrable par pays, CRUD (ex. Brazzaville, Pointe-Noire) |
| 4 | Mauvais mot de passe | Erreur affichée, pas de session |

**API :**

```http
POST /auth/login
{ "email": "admin@monorganisation.com", "password": "ChangeMe123!", "sku": "SOTR" }
```

---

## UC-02 — Structure organisationnelle

**Automatisé CI :** oui (API CRUD smoke) — libellés UI : manuel

**Rôle :** ADMIN  
**Objectif :** CRUD structure + libellés lisibles (pas d’UUID en UI).

| # | Parcours dashboard | Vérifications |
|---|-------------------|---------------|
| 1 | Branches → fiche Headquarters | Nom, adresse, fuseau ; pas de ligne « Identifiant » |
| 2 | Branches → Ajouter « Site Nord » | Visible en liste |
| 3 | Départements → créer « Finance » | CRUD OK |
| 4 | Postes → créer « Analyste » | CRUD OK |
| 5 | Horaires → fiche horaire HQ | Jours de la semaine + lien vers jours ouvrés filtrés |
| 6 | Lieux d’horaire → liste | Branche affichée par nom |
| 7 | Jours ouvrés → `?scheduleId=` depuis fiche horaire | Liste filtrée |
| 8 | Affectations → créer (employé + horaire + lieu) | Fiche : employé, horaire, lieu en libellés |

---

## UC-03 — Cycle de vie employé

**Automatisé CI :** partiel (liste, fiche, contrats) — onglets UI, face, multipart : manuel

**Rôle :** ADMIN  
**Objectif :** formulaire à onglets, contrats en cartes, calendrier fériés.

| # | Étapes | Résultat attendu |
|---|--------|------------------|
| 1 | Employés → Ada Lovelace → fiche | Branche, horaire, liste fériés (nom ou « Par défaut (entreprise) ») |
| 2 | Modifier → onglet Identité | Champs préremplis |
| 3 | Onglet Affectation → liste de jours fériés → Enregistrer | Fiche : nom du calendrier (pas l’UUID) |
| 4 | Onglet Contrats | Cartes compactes : date, badge « Courant », lien fichier |
| 5 | Contrats → Nouveau → signature + notes (+ PDF optionnel) | Nouvelle carte après enregistrement |
| 6 | Menu ⋮ → Modifier un contrat | Onglet Modifier, sauvegarde OK |
| 7 | Menu ⋮ → Supprimer | Erreur affichée si échec ; sinon liste rafraîchie |
| 8 | Onglet Reconnaissance faciale | Enrôlement ou statut enregistré |
| 9 | Enter dans champ Prénom (onglet Identité) | Soumission du formulaire |
| 10 | Employés → Nouveau | Onglets Contrats / Face : message d’attente (employé non créé) |

**API :**

```http
GET  /employees?page=1&limit=20
GET  /employees/:id
GET  /employees/contracts?employeeId=<id>
POST /employees/:id/contracts          # multipart (signedAt, contractFile…)
PATCH /employees/:id/contracts/:contractId
DELETE /employees/:id/contracts/:contractId
POST /face/enroll                    # multipart photo
POST /employees/bulk                 # import CSV (partial success)
GET  /employees/:id/leave-balances?year=2026
```

---

## UC-03b — Import employés CSV

**Automatisé CI :** oui (API partial success) — page upload dashboard : manuel

**Rôle :** ADMIN  
**Objectif :** onboarding masse via dashboard.

| # | Étapes | Résultat attendu |
|---|--------|------------------|
| 1 | Employés → Importer CSV | Page upload + modèle téléchargeable |
| 2 | Importer fichier avec `firstName`, `lastName`, `branchId` | Rapport : X créés, Y erreurs |
| 3 | Ligne avec email déjà existant | Erreur sur la ligne, autres lignes OK |
| 4 | Ligne sans `branchId` | Erreur validation |

**API :**

```http
POST /employees/bulk
{ "employees": [{ "firstName": "Jean", "lastName": "Dupont", "branchId": "<branch_id>" }] }
```

---

## UC-04 — Congés, absences, retards

**Automatisé CI :** oui (API listes, soldes, refus solde) — écrans dashboard : manuel

**Rôle :** ADMIN / MANAGER (selon écran)

| # | Parcours | Données / action | Attendu |
|---|----------|------------------|---------|
| 1 | Congés → Alan Turing | Seed : congé OPEN futur | Fiche : employé, type, dates, statut |
| 2 | Congés → créer (Grace Hopper) | Type Annual Leave | Liste + fiche |
| 3 | Types de congé | Annual Leave (22 j), Sick Leave (10 j) | Champ « Jours alloués / an » |
| 3b | Fiche employé → Soldes congés | Annual Leave : restant / utilisé / alloué |
| 3c | Congés → approuver au-delà du solde | Erreur API « Solde congés insuffisant » |
| 4 | Absences → fiche | Seed : jours ABSENT | Motif, justificatif si URL |
| 5 | Retards → fiche | Seed : liés aux timesheets | Minutes, justification |

**API :**

```http
GET  /leaves?page=1&limit=20
POST /leaves
GET  /leave-types
GET  /employees/:id/leave-balances?year=2026
GET  /employee/leave-balances        # token EMPLOYEE
GET  /employee/leave-types
GET  /absences
GET  /late-records
```

---

## UC-05 — Présence et pointage

**Automatisé CI :** oui (jours, export, événements, logs, POST check-in) — fiches UI : manuel

| # | Parcours | Attendu |
|---|----------|---------|
| 1 | Jours de présence → filtre période + Actualiser | Liste filtrée par dates |
| 1b | Jours de présence → Exporter CSV | Fichier `attendance-days-YYYY-MM-DD_....csv` |
| 2 | Fiche jour « aujourd’hui » (OPEN) | Détail cohérent avec timesheet |
| 3 | Événements → liste | Kiosk par nom |
| 4 | Fiche événement | Employé, kiosk, confiance % ; fil d’Ariane « Détail » |
| 5 | Journaux de reconnaissance | Entrées liées aux kiosques récents |

**API :**

```http
POST /attendance
GET  /attendance/days?from=...&to=...
GET  /attendance/days/export?from=2026-01-01&to=2026-01-31
GET  /attendance/events?...
GET  /face-recognition-logs?page=1&limit=20
```

---

## UC-06 — Feuilles de temps et corrections

**Automatisé CI :** oui (liste, override, historique manager.email) — UI : manuel

**Rôle :** ADMIN / MANAGER

| # | Étapes | Attendu |
|---|--------|---------|
| 1 | Feuilles de temps → jour OPEN (aujourd’hui) | Minutes travaillées, retard, pause, heures sup. |
| 2 | Correction manuelle : modifier valeurs + motif → Appliquer | Message succès, données mises à jour |
| 3 | Historique des corrections | Cartes : date/heure, motif, **email gestionnaire** |
| 4 | Vérifier absence d’UUID | Libellés humains ou « — » |

**API :**

```http
GET   /timesheets?page=1&limit=20
GET   /timesheets/:id
PATCH /timesheets/:id/override
GET   /timesheets/:id/overrides    # manager.email présent
```

---

## UC-07 — Paie

**Automatisé CI :** oui (liste, lignes, export, lock/mark-paid, salaires) — DataTable UI : manuel

**Rôle :** ADMIN

| # | Parcours | Attendu |
|---|----------|---------|
| 1 | Paies → liste | Brouillon mois courant + payée mois précédent |
| 2 | Fiche paie brouillon | Période, statut ; pas de ligne Identifiant |
| 3 | Lignes de paie (DataTable) | Employés par nom, montants, « Voir » explainJson |
| 4 | Verrouiller / Marquer payée | Statut mis à jour |
| 5 | Exporter CSV | Fichier téléchargé |
| 6 | Salaires → liste / fiche | PENDING et PAID du seed |

**API :**

```http
GET  /payroll-runs
GET  /payroll-runs/:id
GET  /payroll-runs/:id/lines
POST /payroll-runs/:id/lock
POST /payroll-runs/:id/mark-paid
GET  /salaries
```

---

## UC-08 — Administration SaaS

**Automatisé CI :** oui (subscriptions, system-config PATCH, audit-logs) — cartes UI : manuel

**Rôle :** ADMIN (Abonnements, Config) ; tous rôles admin pour audit

| # | Page | Étapes | Attendu |
|---|------|--------|---------|
| 1 | `/dashboard/subscriptions` | Ouvrir la page | Cartes : org, plan PRO, limites, dates |
| 2 | `/dashboard/system-config` | Sélectionner carte org | Bordure primaire ; titre « Modifier la configuration — TimeGate Demo » |
| 3 | Modifier seuils → Enregistrer | Valeurs persistées |
| 4 | `/dashboard/audit-logs` | Après actions ci-dessus | Action, entité, email utilisateur, org par nom |

**API :**

```http
GET   /subscriptions
GET   /system-config
PATCH /system-config/:id
GET   /audit-logs
```

---

## UC-09 — Super admin

**Automatisé CI :** oui (organisations, stats plateforme) — écrans dashboard : manuel

**Compte :** `superadmin@monorganisation.com`

| # | Parcours | Attendu |
|---|----------|---------|
| 1 | Organisations → TimeGate Demo | SKU `TMGT`, pas de colonne UUID en liste |
| 2 | Fiche organisation | Détail + gestion si implémentée |

---

## UC-10 — Portail employé web

**Automatisé CI :** oui (API `/employee/*`) — UI `employee-web` : manuel

**Rôle :** EMPLOYEE (`patrick.mukendi@sotrafer.cg`)

**App :** `employee-web` — `http://localhost:3001` (séparée du dashboard admin)

| # | Parcours | Attendu |
|---|----------|---------|
| 1 | Login sur `http://localhost:3001/login` (sans SKU) | Redirection accueil `/` |
| 2 | Accueil | Profil, soldes congés, dernières demandes |
| 3 | Pointages | Filtre période, liste des check-ins |
| 4 | Congés → nouvelle demande | Statut PENDING ; solde affiché |
| 5 | Dashboard admin (`localhost:3000`) | Pas de portail employé intégré |

**API :**

```http
POST /auth/employee/login
GET  /employee/me
GET  /employee/checkins?from=...&to=...
GET  /employee/leaves
GET  /employee/leave-balances
GET  /employee/leave-types
POST /employee/leaves
```

---

## UC-11 — Scénario API séquentiel

**Automatisé CI :** oui

À exécuter dans [`EXAMPLES.http`](../EXAMPLES.http) après login :

1. `POST /auth/login` → `@token`
2. `GET /employees` → noter `employeeId` (ex. Ada)
3. `GET /employees/contracts?employeeId=…`
4. `POST /employees/:id/contracts` (optionnel)
5. `PATCH` / `DELETE` contrat (optionnel)
6. `GET /leave-types`, `GET /holiday-lists`
7. `GET /timesheets` → `GET /timesheets/:id/overrides`
8. `GET /payroll-runs` → lignes
9. `GET /system-config`, `/subscriptions`, `/audit-logs`

---

## UC-12 — Scénario bout-en-bout métier

**Automatisé CI :** oui (parcours API condensé) — parcours dashboard 30 min : manuel

Parcours complet (~30 min), rôle ADMIN :

1. Créer branche + horaire + lieu kiosque
2. Créer employé (Identité, Affectation, Dates)
3. Réouvrir en édition : enrôlement facial + contrat
4. Créer affectation horaire
5. Créer / approuver un congé
6. Enregistrer un pointage (`POST /attendance` ou via kiosque)
7. Vérifier jour de présence et feuille de temps du jour
8. Appliquer une correction manuelle sur la feuille
9. Consulter paie brouillon du mois
10. Vérifier journaux d’audit

---

## Checklist régressions UI (changements récents)

**Automatisé CI :** tests API (`test:use-cases`) + Playwright e2e (`e2e/`) — vérifications manuelles complémentaires si besoin

- [ ] `/dashboard/subscriptions` et `/dashboard/system-config` : cartes, pas DataTable 480px
- [ ] Onglet Contrats employé : cartes + skeleton au chargement
- [ ] Listes (branches, kiosques, types de congé, etc.) : sans colonne Identifiant
- [ ] Fiches détail : sans ligne Identifiant (UUID)
- [ ] Relations non résolues : « — », pas d’UUID brut
- [ ] Pages liste principales : DataTable fonctionnel (recherche, pagination)
- [ ] Historique corrections timesheet : email gestionnaire visible
- [ ] Fiche employé : nom du calendrier fériés si `holidayListId` renseigné

---

## Limites connues

| Élément | Note |
|---------|------|
| Profil utilisateur | Change-password via `PATCH /auth/me/password` (dashboard + employee-web) |
| Portail employé web | PWA installable sur port **3001** |
| App mobile kiosk | Expo — verify facial, **PIN fallback** (`/pin`), sync offline |
| Échange shifts | Approbation = échange des affectations requester ↔ cible sur la date |
| Journaux d’audit | Colonne `entityId` retirée de l’UI ; corrélation via export/API si besoin support |

---

## Références

- Seed : [`../prisma/seed.ts`](../prisma/seed.ts)
- Navigation dashboard : [`../../dashboard/lib/navigation.ts`](../../dashboard/lib/navigation.ts)
- Roadmap API : [`roadmap-1.2.0.md`](roadmap-1.2.0.md)
