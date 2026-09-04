# TimeGate — Ecosystem Index

> Hub : `ecosystem-docs/` (racine monorepo) · Skill : `.cursor/skills/timegate-ecosystem/`  
> Détails locaux : `AGENTS.md` + `.skills/` dans chaque package.  
> Docs métier / pilote / specs features : `docs/` (ne pas dupliquer ici).

## Packages

| Package | Path | Role | Port |
|---------|------|------|------|
| api | `api/` | NestJS + Prisma + face engine Python | **4001** (`/api/v1`) |
| dashboard | `dashboard/` | Back-office admin/RH (Next.js) | **3000** |
| console | `console/` | Console plateforme SaaS (`PLATFORM_ADMIN`) | **3002** |
| employee-app | `employee-app/` | App employé Expo (pointages, congés, QR punch) | Metro |
| kiosk-app | `kiosk-app/` | Kiosk facial Expo (provision + verify) | Metro |

> **Naming** : le package employé s’appelle `employee-app` (plus de `employee-web`). Rôle runtime plateforme : `PLATFORM_ADMIN` (routes `/auth/super-admin/*`).

## Read next (on demand)

| If you work on… | Load |
|-----------------|------|
| Auth JWT, rôles, kiosk tokens | `integrations/auth-and-sessions.md` |
| Face enroll / kiosk verify / QR punch | `integrations/face-and-kiosk.md` |
| Pointage, planning, shifts | `integrations/attendance-and-planning.md` |
| Paie, compensation | `integrations/payroll.md` |
| Console SaaS, orgs, abonnements | `integrations/saas-console.md` |
| Enveloppes / erreurs / webhooks | `integrations/api-envelopes.md` |
| Variables d’environnement | `reference/env-vars.md` |
| Carte modules `api/src` | `reference/api-module-map.md` |
| Index `.skills/` par package | `reference/skills-by-package.md` |
| Fiche d’un package | `projects/<name>.md` → `AGENTS.md` |
| Termes métier | `glossary.md` |

## Rules for agents

1. Lire cette index + l’intégration pertinente **avant** une exploration large du codebase.
2. Conventions locales → `.skills/` du package ouvert (2–4 fichiers max via table dans `CLAUDE.md` / `AGENTS.md`).
3. Feature en cours → `docs/superpowers/` du monorepo.
4. Flux cross-package modifié → proposer mise à jour de ce hub.
5. Ne pas explorer `node_modules`, `dist`, `.git`, assets marketing lourds (`docs/jibc-2026/`, PDF) sauf demande explicite.
6. **companyId** : toujours scopé serveur depuis la DB / JWT validé — jamais faire confiance à un ID client pour l’authz (IDOR).
