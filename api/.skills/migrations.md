---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: prisma
audience: agents
---

# migrations

## Commands

```bash
bun run prisma:migrate          # prisma migrate dev
bun run prisma:generate
bun run prisma:seed             # bun prisma/seed.ts
# e2e DB:
bun run prisma:migrate:e2e
bun run prisma:seed:e2e
```

- Migrations : `prisma/migrations/`
- Seed : `prisma/seed.ts`

## Rules

- Une migration = un changement schema reviewable
- Ne pas rewrite l’historique déjà déployé — nouvelle migration
- Après merge schema : `prisma:generate` avant de coder

## Anti-patterns

- ❌ Éditer une migration déjà appliquée en prod
- ❌ Seed qui dépend de secrets non documentés dans `.env.example`

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
