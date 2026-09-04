---
status: draft
last-verified: 2026-09-04
owner: timegate@api
scope: payroll
audience: agents
---

# payroll

## Modules

`pay-groups/` · `payroll-runs/` · `payroll-variable-items/` · `compensation-grid/` · `employee-compensation/`

## Rules

- Toujours scoper company + `assertCompanyAccess`
- Controllers ops + `OperationalAccessGuard`
- Specs produit : `docs/superpowers/specs/*payroll*` / `*compensation*`
- Hub : `docs/ecosystem/integrations/payroll.md`

## Anti-patterns

- ❌ Muter un run d’un autre tenant
- ❌ Logique paie dans le dashboard sans contrat API clair

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
