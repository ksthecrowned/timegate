---
status: stable
last-verified: 2026-09-04
owner: timegate@console
scope: auth
audience: agents
---

# auth-platform-admin

## Gate

- Login **sans SKU**
- `authorize` refuse si `me.role !== 'PLATFORM_ADMIN'`
- Middleware NextAuth **role-aware** (plus strict que dashboard cookie-only)
- Cookies : `AUTH_COOKIE_APP_ID = 'timegate-console'`
- `AUTH_SECRET` **dédié** ≠ dashboard

Rôle runtime : `PLATFORM_ADMIN` (docs anciennes : SUPER_ADMIN). Routes API : `/auth/super-admin/*`.

## Anti-patterns

- ❌ Réutiliser `AUTH_SECRET` / cookies dashboard
- ❌ Laisser entrer un ADMIN company

---

> **Mainteneur** : timegate@console — 90 jours.
> **Source de vérité** : le code.
