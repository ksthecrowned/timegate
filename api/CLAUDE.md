# api

@AGENTS.md

## Démarrage de session — OBLIGATOIRE

Avant exploration large :

1. Lire `../ecosystem-docs/INDEX.md`
2. Lire `../ecosystem-docs/projects/api.md`
3. Lire **2–4** `.skills/` selon la table ci-dessous

## .skills par type de tâche

| Tâche | Fichiers |
|-------|----------|
| Nouveau module / feature | `.skills/module-pattern.md`, `.skills/controllers.md`, `.skills/dtos-validation.md`, `.skills/services-pattern.md` |
| Auth / guards / rôles | `.skills/auth-guards.md` + hub `integrations/auth-and-sessions.md` |
| Multi-tenant / company | `.skills/multi-tenant.md` |
| Prisma / schema | `.skills/prisma.md`, `.skills/migrations.md` |
| Enveloppe / listes | `.skills/api-envelope.md`, `.skills/errors.md` |
| Face / kiosk verify | `.skills/face-engine.md` + hub `integrations/face-and-kiosk.md` |
| Storage photos | `.skills/storage-r2.md` |
| Webhooks | `.skills/webhooks.md` |
| Payroll / compensation | `.skills/payroll.md` + hub `integrations/payroll.md` |
| Swagger | `.skills/swagger.md` |
| Use-case tests | `.skills/testing-use-cases.md` |
| Bootstrap / Render | `.skills/bootstrap-main.md` |
| Secrets / sécu | `.skills/security-env.md` |
| Logs | `.skills/logging.md` |
| Cross-package | `.skills/ecosystem-pointer.md` |

## Fin de tâche

Endpoint / auth / face / envelope touché côté clients → proposer MAJ hub + skills concernés.  
Si un `.skills/` change → `bun run docs:check`.
