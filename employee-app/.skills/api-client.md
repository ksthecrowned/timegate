---
status: stable
last-verified: 2026-09-04
owner: timegate@employee-app
scope: http
audience: agents
---

# api-client

## Fichier

`lib/api.ts` — `employeeApi`, SecureStore `auth_token`, `fetchApi`

Env : **`EXPO_PUBLIC_API_URL`** (≠ kiosk). En `__DEV__`, fallback host Metro si unset.

401 → clear token + `lib/authEvents.ts` logout.

## Anti-patterns

- ❌ Utiliser `EXPO_PUBLIC_TIMEGATE_API_URL` (kiosk)
- ❌ Login via `POST /auth/login` org (utiliser `/auth/employee/*`)
- ❌ Se fier à `expoConfig.extra.apiUrl` en dev (IP stale)

---

> **Mainteneur** : timegate@employee-app — 90 jours.
> **Source de vérité** : le code.
