---
status: stable
last-verified: 2026-09-04
owner: timegate@dashboard
scope: roles
audience: agents
---

# roles-access

## Fichiers

`lib/timegate/roles.ts` — `isDashboardRole`, `canAccess(['ADMIN','MANAGER'], …)`

Audience : ADMIN / MANAGER (EMPLOYEE selon `isDashboardRole`). **Pas** `PLATFORM_ADMIN`.

## Anti-patterns

- ❌ Afficher des écrans admin sans `canAccess`
- ❌ Confondre avec la console plateforme

---

> **Mainteneur** : timegate@dashboard — 90 jours.
> **Source de vérité** : le code.
