---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: testing
audience: agents
---

# testing-use-cases

> Campagne HTTP black-box principale — pas une suite Jest Nest par défaut.

## Commands

```bash
bun run test:use-cases:e2e   # migrate+seed+API E2E puis UC (recommandé)
bun run start:e2e            # API sur E2E_DATABASE_URL (local)
bun run test:use-cases       # refuse si health.e2eDb !== true
bun run cleanup:uc-pollution --dry-run   # inventaire pollution UC
bun run cleanup:uc-pollution --confirm   # purge (souvent preprod)
```

## Fichiers

| Path | Rôle |
|------|------|
| `scripts/test-use-cases.mjs` | Orchestrateur UC-01… |
| `scripts/test/uc-safety.mjs` | Garde-fou `health.e2eDb` |
| `scripts/with-e2e-db.mjs` | Force `DATABASE_URL←E2E_DATABASE_URL` local |
| `scripts/cleanup-uc-pollution.ts` | Purge fixtures UC |
| `scripts/test/helpers.mjs` | `login`, `request`, `pass`/`fail` |
| `scripts/test/sections/ucNN-*.mjs` | Sections domaine |
| `docs/use-cases-test.md` | Doc campagne |

Base URL : `http://127.0.0.1:4001/api/v1` (overridable).

`GET /health` expose `e2eDb` + `dbHost` (hostname seul).

## Rules

- Nouveau flux critique → ajouter/étendre une section `ucXX-*.mjs`
- Specs unitaires `*.spec.ts` rares (ex. AI registry) — secondaire
- **Jamais** `test:use-cases` contre `start:dev` + AlwaysData / preprod

## Anti-patterns

- ❌ Assumer TestingModule Nest comme voie principale
- ❌ Tests qui hardcodent un `companyId` d’un autre tenant
- ❌ `TIMEGATE_UC_ALLOW_ANY_API=1` sauf urgence documentée

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
