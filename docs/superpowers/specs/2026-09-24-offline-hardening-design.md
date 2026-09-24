# Design — Offline stratégique (K)

**Date :** 2026-09-24  
**Statut :** approved for implementation (hardening Phase 2)

## Objectif

```text
Pointage → validation locale → stockage sécurisé → queue
→ reconnexion → sync → accusé serveur
```

Une coupure réseau **ne doit pas** empêcher de pointer (QR employé + face/NFC kiosk).

## Surfaces

| Surface | File | Sync |
|---------|------|------|
| Employé QR | `employee-app/lib/qr-offline-queue.ts` | `POST /employee/qr-punch/sync` |
| Kiosk face/NFC | `kiosk-app/lib/offline-verify-queue.ts` | verify endpoints + `offlineSync=1` |

## Règles durcies (v1)

1. **Idempotence** : `clientId` / `idempotencyKey` unique côté serveur ; resync = ack OK.
2. **Ack** : réponse sync inclut `challengeId` + `acknowledgedAt` ; file locale retire l’item seulement si `ok` ou échec permanent.
3. **Ordre** : sync traite les items par `scannedAt` croissant.
4. **Limites** : batch sync ≤ 50 ; file locale ≤ 100 ; drop après N tentatives (employé) / max attempts (kiosk).
5. **Déduplication** : ne pas enfiler deux fois le même payload QR encore pending.
6. **TTL** : `offlineSyncMaxAgeMinutes` (défaut 720) — déjà côté API.
7. **Trust** : sync QR exige appareil TRUSTED (inchangé).

## Hors scope

- Offline total de toute l’app (congés, messages…)
- GPS offline
- Chiffrement file au-delà de SecureStore / filesystem local existant
