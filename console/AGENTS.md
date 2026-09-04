# AGENTS.md — console

## Ecosystem

- **Index :** `../docs/ecosystem/INDEX.md`
- **Fiche :** `../docs/ecosystem/projects/console.md`
- SaaS : `../docs/ecosystem/integrations/saas-console.md`

## Stack

- Next.js 15, NextAuth — port **3002**
- Audience : **`PLATFORM_ADMIN` uniquement**

## Commands

```bash
bun install
bun run dev
bun run build
bun run typecheck
```

## Notes

- `AUTH_SECRET` **distinct** du dashboard
- Routes API super-admin : `/auth/super-admin/*`
- `organizationId` path = `companyId`

## Do not

- Réutiliser le secret NextAuth du dashboard
- Exposer la console à des users company

## Skills (`.skills/`)

| Tâche | Fichiers |
|-------|----------|
| Auth PLATFORM_ADMIN | `.skills/auth-platform-admin.md` |
| HTTP SaaS | `.skills/http-saas.md` |
| Hub | `.skills/ecosystem-pointer.md` |
