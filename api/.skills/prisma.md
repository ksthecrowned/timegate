---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: prisma
audience: agents
---

# prisma

## Fichiers

- `prisma/schema.prisma` — PostgreSQL (`@@map` tab*)
- `src/prisma/prisma.service.ts` — Prisma 7 + adapter `pg`
- `src/prisma/prisma.module.ts` — global
- `prisma.config.ts` — seed config

## Workflow

```bash
bun run prisma:generate
bun run prisma:migrate    # migrate dev
bun run prisma:seed
bun run prisma:studio
# e2e: prisma:migrate:e2e / prisma:seed:e2e
```

## Rules

- Injecter `PrismaService` (pas de client ad hoc)
- Scoper tenant : `where.companyId`
- IDs doc : `generateDocId` (`common/utils/doc-id.util.ts`)
- Pas de SQL concaténé avec input user

## Anti-patterns

- ❌ Oublier `prisma:generate` après changement schema
- ❌ `findMany` tenant sans filtre company

## Liens

- Voir aussi : `migrations.md`, `multi-tenant.md`

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
