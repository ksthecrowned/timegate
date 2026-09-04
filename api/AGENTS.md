# AGENTS.md — api

## Ecosystem

- **Index :** `../ecosystem-docs/INDEX.md`
- **Fiche :** `../ecosystem-docs/projects/api.md`
- **Routage skills :** [CLAUDE.md](./CLAUDE.md)

## Stack

- Bun, NestJS, Prisma 7, PostgreSQL
- Préfixe `api/v1`, port **4001**, bind `0.0.0.0`
- Face : `python/face_engine.py`
- Swagger : `/api/v1/docs`

## Commands

```bash
bun install
bun run prisma:generate
bun run start:dev
bun run prisma:migrate
bun run prisma:seed
bun run test:use-cases
bun run build
```

## Structure

```
src/           # modules domaine (auth, face, attendance, payroll, saas…)
prisma/        # schema + migrations
python/        # face engine
docs/          # api-json-shapes, public-api, use-cases
.skills/       # patterns à la demande
```

## Conventions

- Controllers fins, logique services
- `companyId` depuis DB / JWT validé — pas d’IDOR
- Après Prisma : `bun run prisma:generate`
- Changement d’enveloppe → `docs/api-json-shapes.md` + hub

## Do not

- Committer secrets / service accounts Firebase
- Dupliquer le hub — MAJ `ecosystem-docs/` si flux cross-package change

## Skills

Routage : [CLAUDE.md](./CLAUDE.md). Validation : `bun run docs:check`.
