---
status: stable
last-verified: 2026-09-04
owner: timegate@employee-app
scope: auth
audience: agents
---

# auth-routing

## Flow

1. `POST /auth/employee/identify`
2. `POST /auth/employee/login`
3. Portal `/employee/*` (me, leaves, checkins, messages…)

## Router

- `(auth)/` — login, forgot/reset password
- `(tabs)/` — home, leave, messages…
- `app/_layout.tsx` — no token → `/login` ; valide `/employee/me`

## Anti-patterns

- ❌ Mélanger écrans auth et tabs sans gate
- ❌ Stocker le token hors SecureStore

---

> **Mainteneur** : timegate@employee-app — 90 jours.
> **Source de vérité** : le code.
