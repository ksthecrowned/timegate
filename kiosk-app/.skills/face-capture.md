---
status: stable
last-verified: 2026-09-04
owner: timegate@kiosk
scope: face
audience: agents
---

# face-capture

## Fichiers

- Gate : `lib/face-capture-gate.ts` (stabilité, pose, yeux)
- Scan : `app/scan.tsx` + `react-native-face-detector-camera`
- Alternates : `pin.tsx`, `nfc.tsx`, `qr.tsx`
- Upload : `POST /auth/kiosk/verify` multipart + `X-Idempotency-Key`

## Anti-patterns

- ❌ Envoyer des frames sans gate de stabilité
- ❌ Matching facial côté device (matching = API + Python)

---

> **Mainteneur** : timegate@kiosk — 90 jours.
> **Source de vérité** : le code.
