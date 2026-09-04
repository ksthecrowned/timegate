---
status: stable
last-verified: 2026-09-04
owner: timegate@kiosk
scope: http
audience: agents
---

# timegate-client

## Fichier

`lib/timegate.ts` — bootstrap, provision, heartbeat, verify/PIN/NFC, features.

JWT lifetime SecureStore : `timegate_mobile_lifetime_token`.

Env : **`EXPO_PUBLIC_TIMEGATE_API_URL`** (LAN ; Android emu `10.0.2.2`).

SSE : `lib/kiosk-sse.ts` · offline queue : `lib/offline-verify-queue.ts`.

## Anti-patterns

- ❌ Env `EXPO_PUBLIC_API_URL` (employee-app)
- ❌ Logger le lifetime JWT en builds prod

---

> **Mainteneur** : timegate@kiosk — 90 jours.
> **Source de vérité** : le code.
