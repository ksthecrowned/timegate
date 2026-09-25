# Design — Employee-app catch-up (Phases 0–2)

**Date:** 2026-09-25  
**Status:** approved for implementation (user: implement all)  
**Cadre:** [`docs/metier/employee-app-rattrapage.md`](../../metier/employee-app-rattrapage.md)

## Scope

| In | Out |
|----|-----|
| Home valeur du jour | GPS punch |
| Colleagues safe endpoint | Coffre docs / ATS |
| Mes heures (timesheets read) | Avances self-service |
| Paie lecture seule non-DRAFT | Offline total app |
| Suivi claims + fil en attente RH | |

## API (JWT employee only)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/employee/colleagues` | id, names, branch, position ; ACTIVE ; same company ; exclude self |
| GET | `/employee/timesheets` | force `employeeId` JWT ; from/to/status/page |
| GET | `/employee/timesheets/:id` | 403 if not owner |
| GET | `/employee/payroll/summary` | lines where run.status ≠ DRAFT |
| GET | `/employee/payroll/lines/:id` | single line, non-DRAFT, owner |
| GET | `/employee/pending-hr` | open claims + REVIEW events + REVIEW timesheets |

## App screens

- `/timesheets`, `/timesheets/[id]`
- `/payroll`, `/payroll/[id]`
- `/punch-claims`
- `/pending-hr`
- Home cards: week hours, leave chip, payroll teaser, pending RH count
- Shift swap uses `/employee/colleagues`
