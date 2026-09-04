# console

## Rôle

Console plateforme SaaS — réservée aux comptes **`PLATFORM_ADMIN`** (table `Admin`). Gestion orgs, plans, abonnements, audit.

## Stack

- Next.js 15, NextAuth, port **3002** (`next dev -p 3002`)

## Auth

- Login sans SKU ; après `/auth/me`, refuse tout rôle ≠ `PLATFORM_ADMIN`
- Routes API : `/auth/super-admin/*`, modules `saas/`, `admin-saas/`
- `AUTH_SECRET` **distinct** du dashboard

## Env

- `NEXT_PUBLIC_TIMEGATE_API_URL=http://localhost:4001/api/v1`
- `AUTH_SECRET`

## Commandes

```bash
cd console
bun install
bun run dev
# build | typecheck | lint
```

## Hub

- `../integrations/saas-console.md`
- `../integrations/auth-and-sessions.md`
