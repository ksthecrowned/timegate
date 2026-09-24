# TimeGate — Runbook démo / pilote multi-secteurs

**Date** : 2026-09-24  
**Public** : interne (demo SOTR + premier pilote)  
**Prérequis** : seed `SOTR` · API + dashboard · capacités plan seed

## Script démo (20 min)

| Min | Écran | Message clé |
| --- | --- | --- |
| 0–2 | Signup / org | Secteur + rythme → presets (dépts/horaires), pas un fork |
| 2–5 | Lieux | Branch admin ≠ lieu de pointe · multi-sites |
| 5–8 | Affectation | Employé → lieu + période · close ≠ delete |
| 8–11 | Kiosk / QR | Pointage vérifiable · wrong-site / archive → REVIEW |
| 11–14 | Centre contrôle | Présence live + file attention (N) |
| 14–17 | Anomalies | Justification → timesheet → paie |
| 17–20 | Mission client | Page `/c/[slug]` · capacité `client_missions` |

## Checklist pilote jour 1

- [ ] Org créée (ou seed SOTR) · 1 lieu actif · 1 horaire · ≥1 employé ACTIVE
- [ ] Affectation de présence couvrant aujourd’hui
- [ ] 1 kiosk provisionné **ou** mission client ACTIVE
- [ ] Pointage accepté **ou** REVIEW explicite (jamais silence)
- [ ] Manager voit team-today / control-center
- [ ] Timesheet du jour recalculable
- [ ] Soft-end contrat testé une fois (employé reste)

## Preuves automatiques

```bash
cd api && bun test src/stress/multisector-stress.spec.ts
cd api && bun run test:use-cases   # UC-20 terrain inclus
```

Voir [`stress-tests-multisecteurs.md`](./stress-tests-multisecteurs.md).
