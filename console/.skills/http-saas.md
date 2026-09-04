---
status: stable
last-verified: 2026-09-04
owner: timegate@console
scope: http
audience: agents
---

# http-saas

- Client : `lib/http/` (même idée que dashboard)
- Wrappers : `lib/api/organizations.ts`, `lib/api/saas.ts`
- UI : `app/(console)/` — orgs, plans, subscriptions, activation-keys, audit…
- Path `organizationId` = **`companyId`**

## Anti-patterns

- ❌ Appeler des routes RH tenant (`/employees`, leaves…) depuis la console
- ❌ Confondre organization UI avec un second modèle Prisma

---

> **Mainteneur** : timegate@console — 90 jours.
> **Source de vérité** : le code.
