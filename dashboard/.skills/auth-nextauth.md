---
status: stable
last-verified: 2026-09-04
owner: timegate@dashboard
scope: auth
audience: agents
---

# auth-nextauth

## Fichiers

- `auth.ts` + `auth.config.ts`
- Handlers : `app/api/auth/[...nextauth]/route.ts`
- Bridge API : `lib/auth/timegate-auth.ts` → `POST /auth/login` (+ `sku`)
- Cookies : `lib/auth/cookies.ts` — `AUTH_COOKIE_APP_ID = 'timegate-dashboard'`
- Middleware Edge : cookie presence only ; rôle réel dans `app/(authenticated)/layout.tsx`

## Rules

- `AUTH_SECRET` **unique** au dashboard (≠ console)
- Docs : `docs/AUTH.md`

## Anti-patterns

- ❌ Partager secret/cookies avec console
- ❌ Mettre la gestion SaaS orgs ici (→ console)

---

> **Mainteneur** : timegate@dashboard — 90 jours.
> **Source de vérité** : le code.
