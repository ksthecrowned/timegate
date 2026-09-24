# Design — Anomalies (I) + Audit trail (J)

**Date :** 2026-09-24  
**Statut :** approved for implementation (Phase 1b)

## Objectif

Passer de « accepté / refusé » à :

`pointage → validation → anomalie éventuelle → résolution → impact paie`

avec un journal immutable des corrections sensibles.

## Principes

1. **Aucune suppression silencieuse** d’événement brut.
2. Les anomalies v1 sont **matérielles** depuis l’existant :
   - `TimeGateAttendanceEvent` en `REVIEW_REQUIRED`
   - `TimeGatePunchClaim` en `OPEN`
   - `TimeGateTimesheetDay` en `REVIEW_REQUIRED`
3. Résolution = décision + **motif obligatoire** + écriture audit `before / after / reason`.
4. Capacité `anomaly_workflow` : file unifiée `/anomalies` (UX ops). La revue événement / claim existante reste utilisable hors file.

## Types d’anomalie (v1)

| Code | Source typique |
|------|----------------|
| `WRONG_SITE` | meta `KIOSK_OTHER_SITE` |
| `LATE_ARRIVAL` | meta `LATE_CHECKIN` |
| `LOW_CONFIDENCE` | meta `LOW_CONFIDENCE` |
| `MISSED_CHECKOUT` / `EARLY_DEPARTURE` / … | punch claim type |
| `TIMESHEET_REVIEW` | timesheet day REVIEW + anomalyFlags |
| `REVIEW_REQUIRED` | fallback |

## API

- `GET /anomalies` — file unifiée (ADMIN/MANAGER), filtre `status`, `kind`, pagination
- `GET /anomalies/:ref` — détail (`event:ID` \| `claim:ID` \| `timesheet:ID`)
- `POST /anomalies/:ref/resolve` — `{ decision, reason }` → délègue aux services existants + audit enrichi

## Audit (J)

`TimeGateAuditLog.metadata` standardisé :

```json
{
  "before": { ... },
  "after": { ... },
  "reason": "…",
  "anomalyKind": "ATTENDANCE_EVENT"
}
```

Toute revue événement, claim, override timesheet, résolution file écrit ce shape.

## Hors scope v1

- Nouveau modèle `Anomaly` dédié (peut venir plus tard)
- Workflow multi-étapes / escalade
- Corrections horodatage événement (garder événement brut)
