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

## Specs produit

- `../../docs/superpowers/specs/2026-07-29-compensation-and-payroll-refactor-design.md`
- `../../docs/superpowers/specs/2026-07-30-payroll-mass-and-deferred-payments-design.md`

En cas de changement de contrat API paie → MAJ ce fichier + shapes dans `api/docs/`.
