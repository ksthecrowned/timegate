# Intégration — Payroll & compensation

## Modules API

| Module | Rôle |
|--------|------|
| `pay-groups/` | Groupes de paie |
| `payroll-runs/` | Cycles / runs |
| `payroll-variable-items/` | Variables sur un run |
| `compensation-grid/` | Grille |
| `employee-compensation/` | Items compensation par employé |

## Clients

- **dashboard** : UI paie / compensation (ADMIN/MANAGER selon permissions)
- Pas d’accès console plateforme aux runs company (sauf ops SaaS globales)

## Règles de calcul (MVP)

- **Prorata réel (v3)** : base + majorations fixes = contractuel × (`jours payés` / `jours prévus du mois`).
  - Jours payés : `PRESENT` / `WORK_FROM_HOME` / `ON_LEAVE` / `ON_HOLIDAY` = 1, `HALF_DAY` = 0.5, `ABSENT` = 0 (congé approuvé peut rattraper un ABSENT).
  - Les absences ne sont **pas** re-déduites en plus (déjà dans le ratio).
  - Retards et HS restent au taux horaire contractuel.
- Variables du run : montants saisis tels quels.
- **Base** : uniquement via la grille de compensation (`poste × type de contrat`). Pas de CTC.

## Types d’emploi (politique)

Sur `EmploymentType` :
- `includeInPayroll` — exclus du `generateLines` si `false`
- `accruesLeave` — allocation congés à 0 si `false`
- `payMode` — `MONTHLY` (prorata) | `FLAT` (indemnité forfaitaire, sans prorata ni retenues retard)

## Avances sur salaire

- Module `salary-advances/` sous `employees/:id/salary-advances`
- Statuts : `PENDING` → `DISBURSED` → `DEDUCTED` (ou `CANCELLED`)
- Au `generateLines` / recalcul DRAFT : avances `DISBURSED` → variable `DEDUCTION` source `SALARY_ADVANCE`, puis statut `DEDUCTED`
- Recalcul du même run : reset réversible des avances liées au run puis ré-application

## Specs produit

- `../superpowers/specs/2026-07-29-compensation-and-payroll-refactor-design.md`
- `../superpowers/specs/2026-07-30-payroll-mass-and-deferred-payments-design.md`

En cas de changement de contrat API paie → MAJ ce fichier + shapes dans `api/docs/`.
