# Référentiel Frappe HRMS — couverture schéma 1.2.0

Modèles alignés sur les tables `tab*` Frappe. Les routes TimeGate (`/salaries`, `/payroll-runs`, timesheets journaliers) restent sur les extensions `timegate_*` ; les modèles ci-dessous préparent l’intégration paie/compta native.

## Déjà présents (cœur RH)

| Modèle Prisma | Table Frappe | Usage TimeGate |
|---------------|--------------|----------------|
| `Company`, `Branch`, `Department`, `Designation` | tabCompany, tabBranch, … | Tenant, sites |
| `Employee`, `EmployeeCheckin`, `Attendance` | tabEmployee, … | RH, présences |
| `ShiftType`, `ShiftLocation`, `ShiftAssignment` | tabShift Type, … | Plannings |
| `HolidayList`, `Holiday` | tabHoliday List, tabHoliday | `/holidays` ; recalculate → `ON_HOLIDAY` |
| `LeaveType`, `LeaveApplication` | tabLeave Type, … | `/leaves` |
| `TimeGateAttendanceEvent`, `TimeGateTimesheetDay` | — | Canonique pointage / agrégation |

## Phase 28 — Paie & compta (schéma)

| Modèle Prisma | Table Frappe | Rôle |
|---------------|--------------|------|
| `Account` | tabAccount | Plan comptable ; lien `Company.defaultPayrollPayableAccount` |
| `SalaryComponent` | tabSalary Component | Composantes salaire (EARNING / DEDUCTION) |
| `SalaryStructure` | tabSalary Structure | Grille salariale |
| `SalaryStructureDetail` | tabSalary Structure Detail | Lignes grille |
| `SalaryStructureAssignment` | tabSalary Structure Assignment | Affectation employé ↔ grille |
| `PayrollEntry` | tabPayroll Entry | Lot de paie Frappe |
| `PaymentEntry` | tabPayment Entry | Paiement sortant |
| `SalarySlip` | tabSalary Slip | Bulletin (lien optionnel `payrollEntryId`) |
| `Timesheet`, `TimesheetDetail` | tabTimesheet | Feuilles de temps Frappe (stub) |

## Extensions TimeGate (hors Frappe)

`TimeGateSalaryRecord`, `TimeGatePayrollRun`, `TimeGatePayrollLine`, contrats, SaaS, kiosks, etc.

## Employé — liste fériés

- `Employee.holidayListId` → `HolidayList` (optionnel).
- Si vide : liste unique `HolidayList` de la `Company` (`companyId` unique).

## Recalculate (phase 26)

- `POST /attendance/days/recalculate` : jour férié sans pointage → `ON_HOLIDAY` (pas `ABSENT`).
- `POST /timesheets/recalculate` : jour férié sans événement → `CLOSED` + flag `HOLIDAY` dans `anomalyFlags`.
