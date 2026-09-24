# TimeGate — Stress tests multi-secteurs (G)

**Date** : 2026-09-24  
**Statut** : **shippable** — suite unit + UC-20 API  
**Feuille de route** : [`feuille-de-route-multisecteurs.md`](./feuille-de-route-multisecteurs.md)

## Objectif

Pour chaque scénario, prouver le **cycle** (même cœur) sans fork produit :

```text
org → lieu → employés → contrat → horaire → affectation
→ pointage → anomalie → validation → timesheet → paie
```

Pas un vanity dashboard : chaque scénario **éprouve une contrainte** réelle.

## Scénarios

| Id | Secteur | Contrainte éprouvée | Preuve code |
| --- | --- | --- | --- |
| `bureau` | Bureau | Mono-site, journée fixe, 1 kiosk | Punch day + fenêtres |
| `formation` | Formation | Multi-horaires (2+ shift types) | Résolution fenêtres distinctes |
| `industrie` | Industrie | 2 kiosks / même site | Capacité `multi_kiosks` |
| `hotel` | Hôtel | Multi-points (locations) | Capacité `multi_locations` |
| `clinique` | Clinique | Nuit + passage minuit | Overnight windows / work date |
| `securite` | Sécurité | Rotation site + wrong-site | Affectation location + REVIEW |
| `nettoyage` | Nettoyage | Mission client QR | Capacité `client_missions` |
| `placement` | Placement | Fin mission ≠ delete employé | `close` assignment + soft-end |

## Commandes

```bash
# Unit (sans API) — invariants moteur par scénario
cd api && bun test src/stress/multisector-stress.spec.ts

# E2E (API up + seed SOTR) — UC-20 terrain mutatif inclus
cd api && bun run test:use-cases
```

UC-20 exerce aussi : création lieu CLIENT_SITE · mission · close affectation · archive/restore · **overnight 22h→07h** · **soft-end contrat** · **punch → recalc timesheet → payroll**.

## Cycle minimal attendu (chaque scénario)

1. Lieu(x) actifs  
2. Employé ACTIVE + contrat courant  
3. Horaire + affectation couvrant le jour  
4. Pointage accepté ou REVIEW explicite (jamais silence)  
5. Timesheet recalculable  
6. Paie / reporting lisibles (liste runs)

## Hors scope G

- Marketplace / SIRH  
- Tracking GPS permanent  
- Fork code par secteur  
