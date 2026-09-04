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

## Types d’emploi (politique)

Sur `EmploymentType` :
- `includeInPayroll` — exclus du `generateLines` si `false`
- `accruesLeave` — allocation congés à 0 si `false`
- `payMode` — `MONTHLY` (prorata) | `FLAT` (indemnité forfaitaire, sans prorata ni retenues retard)

Seed : type **Stage** = paie forfaitaire, pas de congés ; 2 stagiaires démo en plus de l’effectif existant.

## Specs produit

- `../superpowers/specs/2026-07-29-compensation-and-payroll-refactor-design.md`
- `../superpowers/specs/2026-07-30-payroll-mass-and-deferred-payments-design.md`

En cas de changement de contrat API paie → MAJ ce fichier + shapes dans `api/docs/`.
