# Design — Page client kiosk léger (D)

**Date :** 2026-09-24  
**Statut :** approved for implementation (Phase 2)

## Objectif

```text
Client  → lien unique → page QR rotatif
Employé → app → scan → vérif affectation → arrivée / pause / départ
```

Pas de check-in GPS seul en v1. Réutilise le pipeline QR kiosk existant.

## Modèle

`TimeGateClientMission` :

| Champ | Rôle |
|-------|------|
| title | Nom mission / prestation |
| locationId | Lieu `CLIENT_SITE` ou `TEMPORARY` |
| branchId | Branche admin (FK attendance) |
| kioskId | Kiosk virtuel QR-only (1:1) |
| publicSlug | Segment URL `/c/{slug}` |
| status | `DRAFT` \| `ACTIVE` \| `CLOSED` |
| startsAt / endsAt | Fenêtre optionnelle d’affichage |

À la création ACTIVE : créer un `TimeGateKiosk` virtuel (`qrEnabled`, secret HMAC, `face/nfc` off) lié à la location.

## API

- Admin : `CRUD /client-missions` — gate `client_missions` (+ quota kiosk via `assertCanAddKiosk`)
- Public (sans JWT) :
  - `GET /public/client-missions/:slug`
  - `POST /public/client-missions/:slug/qr-challenge`
  - `GET /public/client-missions/:slug/qr-challenge/:id/result`

Redeem employé inchangé : `POST /employee/qr-punch/scan` (payload contient `kioskId` virtuel).

## UI

- Dashboard `/client-missions` — créer, copier lien, activer/fermer
- Page publique dashboard `/c/[slug]` — QR rotatif + poll résultat

## Hors scope v1

- MissionId sur ShiftAssignment (lien affectation — plus tard)
- maxActiveMissions quota dédié
- Page hors dashboard (domaine dédié)
