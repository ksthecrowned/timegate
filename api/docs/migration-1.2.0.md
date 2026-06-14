# TimeGate API — migration schéma 1.2.0

Évolution majeure du modèle de données (Frappe HRMS + extensions TimeGate), **sans rupture de version URL** : les routes restent sous `api/v1`.

## Décisions appliquées

- SaaS conservé : `TimeGateSubscription`, `TimeGateActivationKey`, `TimeGateSystemSettings`
- Événements pointage : `TimeGateAttendanceEvent` (CHECK_IN/OUT, BREAK_*, REVIEW_REQUIRED)
- Présences journalières : `Attendance` (PRESENT, ABSENT, ON_LEAVE, …)
- Luxand : supprimé
- DB : réinitialisation requise en dev (écrasement)
- **Vocabulaire JSON Frappe** : `companyId`, `branchId`, `kioskId`, `defaultShiftId` — migration terminée (`plan-vocabulaire-frappe.md`, `frappe-json-schema.md`)

## JWT — reconnexion obligatoire

Après déploiement de la coupure vocabulaire, le token contient **`companyId`** (plus `organizationId`). Tous les clients dashboard doivent **se reconnecter**. Les kiosks mobile déjà provisionnés conservent le token lifetime jusqu’à expiration ou reconfiguration.

## Routes (api/v1)

| Route | Modèle | Notes |
|-------|--------|-------|
| `/branches` | `Branch` | Succursales (ex-`/sites`, **404**) |
| `/kiosks` | `TimeGateKiosk` | Bornes (ex-`/devices`, **404**) |
| `/shift-types` | `ShiftType` | Plannings (ex-`/work-schedules`, **404**) |
| `/face-recognition-logs` | `FaceRecognitionLog` | Lecture seule ; sortie `kioskId` |
| `/attendance` | `EmployeeCheckin` | Punches ; sortie `kioskId` + `kiosk` |
| `/attendance/events` | `TimeGateAttendanceEvent` | Canonique + review ; `kioskId` |
| `/attendance/days` | `Attendance` | Présence journalière |
| `/attendance/days/recalculate` | — | Filtres `branchId`, `companyId` |
| `/timesheets/recalculate` | — | Filtres `branchId`, `companyId` |
| `/work-days` | `ShiftTypeWeekDay` | Corps `scheduleId` (= shift type) |
| `/holidays` | `Holiday` (+ `HolidayList`) | Sortie `companyId`, `company?` |
| `/leaves` | `LeaveApplication` | `companyId` |
| `/timesheets` | `TimeGateTimesheetDay` | Override manager |
| `/late-records` | `TimeGateLateRecord` | Sync depuis timesheets |
| `/absences` | `TimeGateAbsenceRecord` | Sync depuis `Attendance` ABSENT |
| `/salaries` | `TimeGateSalaryRecord` | |
| `/payroll-runs` | `TimeGatePayrollRun` + lignes | lock / paid ; export CSV |
| `/system-config` | `TimeGateSystemSettings` | |
| `/subscriptions` | `TimeGateSubscription` | |
| `/audit-logs` | `TimeGateAuditLog` | |
| `/auth/mobile/bootstrap` | — | Réponse `branches[]` |
| `/auth/mobile/provision` | `TimeGateKiosk` | Corps `branchId`, `kioskId?` ; réponse `kiosk` |
| `/auth/mobile/verify` | `FaceRecognitionLog` + événements | Multipart photo |
| `/auth/mobile/heartbeat` | `TimeGateKiosk` | lastSeenAt / ONLINE |
| `/auth/employee/login` | `User` + `Employee` | JWT avec `companyId` |
| `/employee/me` | `Employee` | Profil self-service |
| `/employee/checkins` | `EmployeeCheckin` | |
| `/employee/leaves` | `LeaveApplication` | |
| `/employees/contracts` | `TimeGateEmployeeContract` | `companyId` |
| `/shift-locations` | `ShiftLocation` | `branchId` |
| `/shift-assignments` | `ShiftAssignment` | |
| `/departments` | `Department` | |
| `/designations` | `Designation` | |

Super-admin : `POST /super-admin/organizations/:organizationId/…` — le paramètre URL reste nommé `organizationId` mais identifie une **company**.

## Clients (dashboard, kiosk, mobile)

| Client | Variable | Valeur dev typique |
|--------|----------|-------------------|
| Dashboard | `NEXT_PUBLIC_TIMEGATE_API_URL` | `http://localhost:4001/api/v1` |
| Mobile Expo | `EXPO_PUBLIC_TIMEGATE_API_URL` | `http://<IP-LAN>:4001/api/v1` |
| API | `PORT` | `4001` |

**Dashboard** : appels API vers `/branches`, `/kiosks`, `/shift-types` ; pages UI sous `/timegate/sites` et `/timegate/devices` (chemins Next inchangés, libellés « Succursales » / « Kiosks »).

**App kiosk (Expo)** : bootstrap `branches` → provision `branchId` / `kioskId` → `POST /auth/mobile/verify` ; file offline locale ; heartbeat.

## Réinitialiser la base (dev)

```bash
cd api
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="oui j'écrase la db" npx prisma migrate reset --force
npx prisma db seed
```

## Schéma Frappe paie/compta (phase 28)

Tables : `tabAccount`, `tabSalary Component`, `tabSalary Structure`, … — détail `docs/frappe-schema-1.2.0.md`.

Migration : `20260521220000_holidays_recalculate_frappe_payroll`.

## Suite

- Checklist staging : section 4 de `plan-vocabulaire-frappe.md`
- Tests e2e optionnels : `roadmap-1.2.0.md` phase 27
