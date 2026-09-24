# Design — Contexte événement / VerificationContext (M)

**Date :** 2026-09-24  
**Statut :** approved for implementation

## Objectif

Chaque `TimeGateAttendanceEvent` porte un **registre vérifiable** :

`qui / où / quand / par quel moyen / dans quel contexte`

GPS = **slot** prévu, non utilisé en v1.

## Shape (`meta.verificationContext`)

```ts
{
  version: 1,
  employeeId: string,
  location: { id, name, type, clientLabel } | null,
  mission: { id, title, publicSlug } | null,  // client page
  kiosk: { id, name, channel: 'kiosk' | 'client_page' },
  authMethod: 'FACE' | 'PIN' | 'NFC' | 'QR' | 'MOBILE' | null,
  device: { trustedDeviceId?: string } | null,
  assignment: { id, locationId, shiftTypeId } | null,
  shift: { id, name } | null,
  timestamps: { occurredAt: ISO, recordedAt: ISO },
  gps: null,  // stub — complément futur, pas tracking
  flags: { wrongSite?: boolean, lateAbsent?: boolean }
}
```

## Implémentation

- Construit dans `AttendancePunchRecorderService` à chaque `recordEvent`
- Fusionné dans `meta` (préserve `autoReviewReason` / review fields)
- Exposé en API via `toCanonicalEventShape` → `verificationContext`
- UI dashboard détail événement : section « Registre vérifiable »

## Hors scope v1

- Colonne Prisma dédiée (reste dans `meta` JSON)
- Capture GPS réelle
- Backfill massif des anciens événements
