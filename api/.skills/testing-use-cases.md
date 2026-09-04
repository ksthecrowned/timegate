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
bun run test:use-cases       # API déjà up
bun run test:use-cases:e2e   # migrate+seed e2e puis run
```

## Fichiers

| Path | Rôle |
|------|------|
| `scripts/test-use-cases.mjs` | Orchestrateur UC-01… |
| `scripts/test/helpers.mjs` | `login`, `request`, `pass`/`fail` |
| `scripts/test/sections/ucNN-*.mjs` | Sections domaine |
| `docs/use-cases-test.md` | Doc campagne |

Base URL : `http://127.0.0.1:4001/api/v1` (overridable).

## Rules

- Nouveau flux critique → ajouter/étendre une section `ucXX-*.mjs`
- Specs unitaires `*.spec.ts` rares (ex. AI registry) — secondaire

## Anti-patterns

- ❌ Assumer TestingModule Nest comme voie principale
- ❌ Tests qui hardcodent un `companyId` d’un autre tenant

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
