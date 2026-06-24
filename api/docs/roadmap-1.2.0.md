# Roadmap TimeGate 1.2.0

## Terminé

| # | Phase | Livrable |
|---|--------|----------|
| 1 | Fondation schéma | Prisma 1.2.0, SaaS, IDs Frappe, migration `timegate_1_2_0_init` |
| 2 | Tenant & structure | `Branch` via `/branches` |
| 3 | Auth & SaaS | Login, subscription, mobile verify, super-admin orgs |
| 4 | Kiosks | `TimeGateKiosk` via `/kiosks` + heartbeat |
| 5 | Face & logs | Enroll, `FaceRecognitionLog` via `/face-recognition-logs` |
| 6 | Employés | CRUD `/employees` (sans contrats) |
| 7 | Checkins | `GET/POST /attendance` → `EmployeeCheckin` |
| 8 | Événements canoniques | `/attendance/events` + review + audit |
| 9 | **Présences journalières** | `/attendance/days`, recalculate, lien checkins, auto PRESENT au check-in |
| 10 | **Shifts & plannings** | `/shift-types` → `ShiftType`, `/work-days` → `ShiftTypeWeekDay`, lien employé `defaultShiftId` |
| 11 | **Jours fériés** | `/holidays` → `HolidayList` + `Holiday` (1 liste / company) |
| 12 | **Congés** | `/leaves` → `LeaveApplication` ; sync `Attendance` ON_LEAVE via recalculate |
| 13 | **Timesheets** | `/timesheets` → `TimeGateTimesheetDay` ; recalculate v1 (événements ACCEPTED) ; override manager |
| 14 | **Retards & absences** | `/late-records`, `/absences` ; sync depuis timesheets / présences ABSENT |
| 15 | **Paie** | `/salaries`, `/payroll-runs` (moteur v1, lignes, lock, export CSV) |
| 19 | **Config clients** | URL par défaut `…/api/v1` port 4001 ; `.env.example` ; logs → `/face-recognition-logs` |
| 20 | **Dashboard — core** | Pages alignées API 1.2.0 ; présences jour ; admin SaaS lecture |
| 17 | **Admin SaaS (lecture)** | `GET /system-config`, `/subscriptions`, `/audit-logs` |
| 23 | **App kiosk** | URL v1, provision, verify, sync offline, heartbeat mobile |
| 22 | **Dashboard — RH / paie** | Workbench RH, sync retards/absences, KPI home, libellés FR |
| 24 | **App employé** | Rôle EMPLOYEE, `/employee/*`, écrans Expo `/employee` |
| 16 | **Contrats employé** | `TimeGateEmployeeContract`, upload R2, `/employees/contracts` |
| 10b | **Shift assignments & locations** | CRUD `/shift-locations`, `/shift-assignments` ; filtre verify kiosk |
| 18 | **Départements / designations** | CRUD `/departments`, `/designations` ; lien employé |
| 25 | **REVIEW_REQUIRED auto** | `minConfidence` tenant + `FACE_VERIFY_THRESHOLD` → statut événement ; punch différé jusqu'à validation |
| 26 | **Fériés dans recalculate** | `HolidayList` company + `employee.holidayListId` → `ON_HOLIDAY` / timesheet `HOLIDAY` |
| 28 | **Schéma Frappe complet** | Account, Salary Component/Structure, Payroll Entry, Payment Entry ; voir `frappe-schema-1.2.0.md` |

| 29 | **Vocabulaire Frappe unique** | JSON + JWT `companyId` ; dashboard + mobile ; `frappe-json-schema.md` |
| 30 | **Routes canoniques** | `/branches`, `/kiosks`, `/shift-types` ; `/sites`, `/devices` → 404 |
| 32 | **Soldes congés temps réel** | API + dashboard + employee-web |
| 33 | **Import employés CSV** | `POST /employees/bulk` + page dashboard |
| 34 | **Planning calendrier équipe** | `/planning` + API calendar |
| 35 | **PIN fallback kiosk** | Mobile `/pin` + API verify-pin |
| 36 | **Portail employé web PWA** | `employee-web` port 3001, manifest + SW |
| 38 | **Export présence CSV/PDF** | API `format=csv|pdf` |
| 39 | **Échange shifts** | `/shift-swaps` |
| 40 | **Prévu vs réalisé** | `GET /dashboard/planning-vs-actual` + home KPI |
| 41 | **Recherche globale** | `GET /search` + navbar |

## Lot ABC 2026-06 (livré)

| Item | Livrable |
|------|----------|
| A | `PATCH /auth/me/password`, `PATCH /auth/me`, profil dashboard + employee-web |
| B | Playwright `e2e/` + job CI |
| C | Export PDF serveur, KPI planning, PWA employee-web |

## Optionnel / qualité

| # | Phase | Contenu |
|---|--------|---------|
| 27 | Tests e2e | Parcours login → verify → recalculate days |
| 31 | UX dashboard | Renommer routes UI `/timegate/branches`, `/timegate/kiosks` (API déjà canonique) |

## Inspiration Kronos HR — backlog 1.3.x

Comparaison détaillée vs [Kronos HR](https://www.kronoshr.com/fr/). Sélection priorisée par **impact UX PME** × **effort** × **alignement TimeGate** (visage + SaaS + paie).

| Priorité | # | Fonctionnalité | Pourquoi | Effort | Dépendances |
|----------|---|----------------|----------|--------|-------------|
| **P0** | 32 | **Soldes congés temps réel** | Gap UX le plus visible vs Kronos ; API congés existe sans quota | M | `LeaveType.maxDays`, ledger par employé, recalculate à l’approbation |
| **P0** | 33 | **Import employés CSV** | Onboarding PME ; seed manuel aujourd’hui | S | Parser CSV dashboard, `POST /employees/bulk` |
| **P1** | 34 | **Planning calendrier équipe (vue mois)** | Remplace listes `shift-assignments` ; cœur produit Kronos | L | Page `/planning`, API agrégée par jour/employé |
| **P1** | 35 | **Pointage PIN fallback kiosk** | Adoption sites sans confiance visage ou éclairage faible | M | PIN hash employé, mode verify alternatif mobile |
| **P1** | 36 | **Portail employé web** | Congés + historique ; API `/employee/*` déjà prête | M | Routes `(authenticated)/employee/*` ou sous-domaine |
| **P2** | 37 | **Calendrier congés équipe** | Visibilité manager ; complète soldes congés | M | #32 + vue calendrier partagée |
| **P2** | 38 | **Export fiche présence PDF/CSV** | Conformité légale mentionnée par Kronos | S | Template période + `/attendance/days` export |
| **P2** | 39 | **Échange de shifts** | Self-service Kronos ; différenciation RH | L | Workflow demande → approbation manager |
| **P3** | 40 | **Prévu vs réalisé dashboard** | KPI planning ; données timesheets déjà là | M | #34 + agrégats home |
| **P3** | 41 | **Recherche globale** | UX Kronos ; nombreuses entités dashboard | M | Index client ou endpoint `/search` |
| **—** | — | Rotations auto, multi-validateurs, QR | Reportés : complexité > gain court terme | — | — |

### Lot recommandé « 1.3.0 — PME ready »

1. **#32 Soldes congés** — mobile employé + dashboard manager  
2. **#33 Import CSV** — onboarding org  
3. **#36 Portail employé web** — parité app mobile sur le web  
4. **#38 Export fiche présence** — argument conformité  

### Lot « 1.4.0 — Planning »

1. **#34 Calendrier planning**  
2. **#37 Calendrier congés équipe**  
3. **#40 Prévu vs réalisé**

### Non retenu (garder différenciation TimeGate)

- Remplacer le visage par PIN/QR comme mode principal (PIN = fallback seulement)  
- Simplifier la paie pour imiter Kronos (TimeGate = upsell paie)
