---
status: stable
last-verified: 2026-09-04
owner: timegate@employee-app
scope: punch
audience: agents
---

# qr-punch

## Fichiers

`lib/qrPunch.ts` + trusted device / install id · écran `qr-punch`

API : `POST /employee/qr-punch/scan` (challenge kiosk).

Hub : `ecosystem-docs/integrations/face-and-kiosk.md`.

## Anti-patterns

- ❌ Scanner sans appareil de confiance quand l’API l’exige
- ❌ Implémenter le verify facial ici (c’est kiosk-app)

---

> **Mainteneur** : timegate@employee-app — 90 jours.
> **Source de vérité** : le code.
