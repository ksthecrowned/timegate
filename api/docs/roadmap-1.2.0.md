# Roadmap TimeGate API — livré

Synthèse des capacités déjà en place sous `api/v1`. Pour le backlog produit courant, voir `TODOS.md`.

## API & modèle

| Domaine | Routes / modèles |
|---------|------------------|
| Tenant & structure | `/branches`, `Company`, `Branch` |
| Auth & SaaS | Login JWT (`companyId`), `/subscriptions`, `/system-config`, `/audit-logs`, super-admin |
| Kiosks | `/kiosks`, heartbeat ; push tokens via `/devices` |
| Face | Enroll + verify (`face_recognition` local), `/face-recognition-logs` |
| Employés | `/employees`, contrats, bulk CSV, départements / designations |
| Pointage | `/attendance`, `/attendance/events` (+ review), `/attendance/days` (+ recalculate) |
| Plannings | `/shift-types`, `/work-days`, `/shift-locations`, `/shift-assignments`, `/shift-swaps`, `/planning` |
| Congés & fériés | `/leaves` (soldes), `/holidays` ; recalculate `ON_LEAVE` / `ON_HOLIDAY` |
| Timesheets & RH | `/timesheets`, `/late-records`, `/absences` |
| Paie | `/payroll-runs` (lignes, lock, mark-paid, export) — pas de route `/salaries` |
| Apps | Kiosk Expo, employee-app, portail employé web |
| Divers | Recherche `/search`, export présence CSV/PDF, PIN fallback kiosk |

## Lots livrés (repères)

| Lot | Contenu |
|-----|---------|
| ABC 2026-06 | Profil / mot de passe, Playwright `e2e/`, export PDF, KPI planning, PWA employee-web |

## Qualité optionnelle

| # | Sujet |
|---|--------|
| 27 | Parcours e2e API login → verify → recalculate days |
| 31 | Aligner chemins UI dashboard si des alias `/timegate/*` restent |

## Formes JSON

Voir [`api-json-shapes.md`](api-json-shapes.md) et [`public-api.md`](public-api.md).
