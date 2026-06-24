# TimeGate — Lot A+B+C + écarts (design)

**Date :** 2026-06-19  
**Statut :** Approuvé  
**Périmètre :** Compte utilisateur (A), tests Playwright (B), conformité RH PDF + KPI (C), correction des écarts documentés, PWA complète `employee-web`, PDF serveur.

---

## Contexte

TimeGate 1.2.x est fonctionnel (API, dashboard, kiosk, portail employé minimal). Une partie du backlog 1.3.x est déjà implémentée mais non reflétée dans la roadmap. Ce lot vise à :

1. Rendre opérationnels les flux compte utilisateur (change-password, profil admin).
2. Livrer export PDF présence et KPI prévu vs réalisé.
3. Verrouiller par Playwright les parcours critiques.
4. Corriger les écarts UX/doc identifiés.
5. Transformer `employee-web` en PWA installable complète.

**Approche retenue :** incrémental par couche (écarts → A → C → B).

---

## Hors scope

| Item | Raison |
|------|--------|
| Service facial externe (`FACE_RECO_MODE=external`) | Industrialisation future |
| Renommage routes UI `/timegate/*` | Cosmétique (#31 roadmap) |
| Docker / déploiement production | Lot séparé |
| Échange shifts côté employé | Feature RH self-service future |
| API notifications complète | Masquer la cloche dashboard (pas de faux panneau) |
| Push notifications PWA | Backlog post-PWA v1 |

---

## 1. Écarts & bugs

### 1.1 DataTable export trompeur

**Problème :** `dashboard/components/ui/DataTable.tsx` affiche Excel, PDF, Copier, Imprimer mais tous appellent `exportCSV`.

**Correction :** Ne conserver que **Exporter CSV** dans le menu export. Supprimer les entrées non implémentées.

### 1.2 Notifications navbar

**Problème :** Panneau offcanvas avec `{/* TODO: liste des notifications */}`.

**Correction :** Masquer l’icône cloche et le panneau jusqu’à une API notifications dédiée.

### 1.3 Documentation

| Fichier | Action |
|---------|--------|
| `README.md` (racine) | Retirer ou marquer « planifié » le mode `FACE_RECO_MODE=external` ; documenter moteur Python interne uniquement |
| `api/.env.example` | Aligner sur les variables réellement lues par le code |
| `api/docs/roadmap-1.2.0.md` | Marquer #32–#41 terminés/partiels ; ajouter section « Lot ABC » |
| `api/docs/use-cases-test.md` | Mettre à jour limites connues après implémentation A/C |

---

## 2. Compte utilisateur (A)

### 2.1 API — change password

```
PATCH /api/v1/auth/me/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Rôles autorisés :** `ADMIN`, `MANAGER`, `SUPER_ADMIN`, `EMPLOYEE`.

**Règles :**

- `currentPassword` obligatoire ; vérification bcrypt contre `User.passwordHash`.
- `newPassword` : minimum 8 caractères, différent de `currentPassword`.
- Réponse `200` : `{ "ok": true }`.
- Erreurs : `400` validation, `401` mauvais mot de passe actuel.

**Audit :** entrée `TimeGateAuditLog` avec action `PASSWORD_CHANGED`, entité `User`, sans stocker le MDP.

### 2.2 API — mise à jour profil (admin/manager/super-admin)

```
PATCH /api/v1/auth/me
Body: { "firstName"?: string, "lastName"?: string }
```

- Champs optionnels, trim, max 140 caractères.
- Email non modifiable via cette route.
- Étendre `GET /auth/me` :

```json
{
  "id": "...",
  "email": "...",
  "firstName": "Jean",
  "lastName": "Dupont",
  "role": "ADMIN",
  "companyId": "...",
  "employeeId": null
}
```

**Employés :** pas de `PATCH /auth/me` côté portail — données RH en lecture seule.

### 2.3 Dashboard — `/profile`

| Onglet | Comportement |
|--------|--------------|
| Informations | Édition prénom/nom → `PATCH /auth/me` ; email et rôle en lecture seule |
| Mot de passe | Formulaire 3 champs → `PATCH /auth/me/password` ; messages succès/erreur FR |

**Navbar :** afficher `firstName lastName` si renseignés, sinon email.

### 2.4 Employee-web — profil

- Nouvelle route `/profile` (onglet bottom nav « Profil »).
- Affichage profil employé (`GET /employee/me`) en lecture seule.
- Section « Sécurité » : change-password via `PATCH /auth/me/password` (même token JWT employé).
- Déconnexion reste dans le header.

### 2.5 Tests API

Étendre `uc01-auth.mjs` :

- Change password admin OK + re-login.
- Mauvais `currentPassword` → 401.
- `newPassword` trop court → 400.

Étendre `uc10-employee.mjs` :

- Change password employé OK + re-login.

---

## 3. Conformité RH (C)

### 3.1 Export PDF présence (serveur)

**Route :**

```
GET /api/v1/attendance/days/export?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv|pdf
```

Paramètres existants conservés : `branchId`, `employeeId`, `status`.

| `format` | Réponse |
|----------|---------|
| `csv` (défaut) | `{ filename, csv }` — comportement actuel |
| `pdf` | `{ filename, contentBase64, mimeType: "application/pdf" }` |

**Génération PDF (API) :**

- Librairie : `pdfkit` (pas de headless browser).
- Contenu : en-tête (nom company si dispo, période, date d’export), tableau colonnes = date, employé, branche, statut, horaire, type congé, nb check-ins.
- Même filtres et requête Prisma que `exportCsv`.

**Dashboard** (`/attendance/days`) :

- Deux boutons distincts : **Exporter CSV** et **Exporter PDF**.
- Téléchargement côté client via blob/base64.

### 3.2 KPI Prévu vs réalisé

**Route :**

```
GET /api/v1/dashboard/planning-vs-actual?from=YYYY-MM-DD&to=YYYY-MM-DD&branchId?
```

**Réponse :**

```json
{
  "from": "2026-06-01",
  "to": "2026-06-30",
  "plannedMinutes": 12480,
  "workedMinutes": 11820,
  "varianceMinutes": -660,
  "coveragePercent": 94.7,
  "byWeek": [
    { "week": "2026-W23", "label": "S23", "plannedMinutes": 3120, "workedMinutes": 2950 }
  ]
}
```

**Calcul v1 :**

| Métrique | Source |
|----------|--------|
| **Prévu** | Pour chaque jour `[from, to]` et chaque employé actif de la company (filtré `branchId` si fourni) : si `ShiftAssignment` couvre la date → minutes planifiées = `endTime - startTime` du `ShiftType` (fallback `defaultShiftId` employé, sinon 480 min). Jours fériés (`Holiday` via liste company ou employé) et congés `APPROVED`/`OPEN` → 0 min prévu ce jour-là. |
| **Réalisé** | Somme `TimeGateTimesheetDay.workedMinutes` sur la même période et les mêmes employés. |

**Dashboard home :**

- Carte « Couverture planning » (`coveragePercent` %).
- Graphique barres groupées dans `DashboardAnalytics` : prévu vs réalisé par semaine (30 derniers jours).
- Lien « Voir le planning » → `/planning`.

**Client :** nouveau module `lib/timegate/planning-vs-actual.ts` ; intégration dans `loadDashboardData`.

### 3.3 Tests API

- UC-05 : export `format=pdf` retourne base64 PDF non vide, headers cohérents.
- UC-13 (nouveau) : `planning-vs-actual` avec seed → `plannedMinutes > 0`, `workedMinutes >= 0`, `coveragePercent` calculé.

---

## 4. PWA complète — employee-web

### 4.1 Objectif

Application installable sur mobile (Add to Home Screen), shell offline, icônes, manifest — sans push notifications en v1.

### 4.2 Manifest

Fichier `employee-web/public/manifest.webmanifest` :

```json
{
  "name": "TimeGate — Espace employé",
  "short_name": "TimeGate",
  "description": "Pointages et congés",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0828",
  "theme_color": "#0f0828",
  "lang": "fr",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

Lien dans `app/layout.tsx` : `<link rel="manifest" href="/manifest.webmanifest" />`.

### 4.3 Service Worker

- Package : `@serwist/next` (Next.js 15 App Router).
- Stratégie :
  - **Precache :** assets statiques, pages shell (`/`, `/checkins`, `/leaves`, `/profile`, `/login`).
  - **NetworkFirst :** appels API (`/employee/*`, `/auth/*`).
  - **Offline :** page `/offline` avec message « Connexion requise pour actualiser ».
- Cache lecture : après fetch réussi, stocker en `localStorage` ou Cache API la dernière réponse de `/employee/me`, soldes congés et 20 derniers check-ins pour affichage stale offline (badge « Données hors ligne »).

### 4.4 Icônes

- Générer `public/icons/icon-192.png` et `icon-512.png` (logo TimeGate, fond `#0f0828`).
- Apple touch icon `apple-touch-icon.png`.

### 4.5 UX install

- Bandeau discret (première visite mobile) : « Installer l’application » via `beforeinstallprompt` (Android) ; instructions iOS dans tooltip.
- `metadata` Next.js : conserver `appleWebApp.capable`.

### 4.6 Navigation complète

Bottom nav 4 onglets :

| Onglet | Route |
|--------|-------|
| Accueil | `/` |
| Pointages | `/checkins` |
| Congés | `/leaves` |
| Profil | `/profile` |

### 4.7 Build

- `next.config.js` : intégration Serwist ; `skipWaiting` en prod.
- CI frontend : `employee-web` build doit passer (SW généré au build).

---

## 5. Tests Playwright (B)

### 5.1 Structure

```
e2e/
  playwright.config.ts
  package.json
  fixtures/
    api.ts          # helpers login via API
  dashboard/
    profile.spec.ts
    attendance-export.spec.ts
    home-kpi.spec.ts
  employee-web/
    profile.spec.ts
    pwa-manifest.spec.ts   # manifest + SW registered
```

### 5.2 Scénarios minimum

| Spec | Steps | Assert |
|------|-------|--------|
| `dashboard/profile` | Login admin → profil → change MDP → re-login | Nouveau MDP accepté |
| `dashboard/attendance-export` | Jours présence → export CSV + PDF | Fichiers téléchargés, taille > 0 |
| `dashboard/home-kpi` | Home dashboard | Carte/graphique prévu vs réalisé visible |
| `employee-web/profile` | Login employé → profil → change MDP | Re-login OK |
| `employee-web/pwa-manifest` | GET `/manifest.webmanifest` | `display: standalone`, icônes présentes |

### 5.3 CI

Nouveau job `e2e` dans `.github/workflows/ci.yml` :

1. Postgres + migrate + seed.
2. `api` start:prod.
3. `dashboard` et `employee-web` build + start.
4. `npx playwright install --with-deps && npx playwright test`.
5. Upload report en artefact si échec.

Variables : `PLAYWRIGHT_BASE_URL_DASHBOARD=http://localhost:3000`, `PLAY:3001` pour employee-web.

---

## 6. Ordre d’implémentation

| Phase | Livrables |
|-------|-----------|
| **0** | Écarts (DataTable, navbar, docs) |
| **1** | API password + profile ; dashboard profil ; tests UC-01/10 |
| **2** | API PDF export + planning-vs-actual ; dashboard attendance + home KPI ; tests UC-05/13 |
| **3** | PWA employee-web (manifest, Serwist SW, icons, profile, offline) |
| **4** | Playwright + job CI e2e |

---

## 7. Critères d’acceptation

- [ ] Admin peut changer son mot de passe depuis `/profile` et se reconnecter.
- [ ] Employé peut changer son mot de passe depuis `employee-web/profile`.
- [ ] Export PDF présence télécharge un PDF valide pour une période seed.
- [ ] Dashboard home affiche couverture planning % et graphique prévu/réalisé.
- [ ] `employee-web` : manifest valide, SW actif, installable, page offline.
- [ ] DataTable n’affiche plus d’options export fausses.
- [ ] Cloche notifications absente du dashboard.
- [ ] Playwright vert en CI sur les 5 specs minimum.
- [ ] Roadmap et use-cases-test à jour.

---

## 8. Risques

| Risque | Mitigation |
|--------|------------|
| Serwist + Next 15 incompatibilité | Pin version testée ; fallback `@ducanh2912/next-pwa` si blocage |
| Calcul prévu complexe (assignments partiels) | v1 stricte : assignment active si date ∈ [startDate, endDate] ou dates nulles |
| PDF volumineux sur longues périodes | Limite soft 10 000 lignes ; message si dépassement |
| E2E flaky (timing) | `waitForResponse` API ; retries CI = 1 |

---

## Décisions validées

| Question | Décision |
|----------|----------|
| PDF | Génération **serveur** (`pdfkit`) |
| Employee-web | **PWA complète** (manifest, SW, offline shell, profil MDP) |
| Notifications | Masquer cloche dashboard (pas d’API v1) |
| Profil employé | Lecture seule RH ; seul change-password éditable |
