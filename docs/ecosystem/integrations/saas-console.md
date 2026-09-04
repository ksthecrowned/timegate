# Intégration — Console SaaS

## Rôle

La **console** (port 3002) pilote le multi-tenant : organisations (companies), plans, abonnements, clés d’activation, audit — comptes **`PLATFORM_ADMIN`** uniquement.

## Modules API

| Zone | Chemins |
|------|---------|
| Super-admin auth | `/auth/super-admin/organizations…`, admins, activation keys |
| SaaS | `src/saas/` — `organizations`, plans, platform-settings |
| Admin SaaS | `src/admin-saas/` — subscriptions, audit-logs, system-config, stats |

## Mapping noms

| UI / path | Modèle |
|-----------|--------|
| Organization | `Company` (`companyId`) |
| SUPER_ADMIN (docs anciennes) | rôle JWT `PLATFORM_ADMIN` |

## Auth console

1. Login NextAuth → tokens API
2. `GET /auth/me` — si rôle ≠ `PLATFORM_ADMIN` → refus UI
3. `AUTH_SECRET` **ne doit pas** être partagé avec dashboard

## Seed / local

Voir README racine et seeds API pour comptes plateforme / org de démo.
