# Design — Contexte écosystème TimeGate

**Date :** 2026-09-04  
**Statut :** Approuvé — implémentation en passes

## Objectif

Même niveau de contexte agent que Ride (`ride-platform-docs` + `AGENTS.md` + `.skills/`), adapté au **monorepo** TimeGate, pour éviter l’exploration de centaines de fichiers en début de session.

## Décisions

| Sujet | Choix |
|-------|-------|
| Hub | `ecosystem-docs/` à la racine du monorepo |
| Auto-chargé | `INDEX.md` ≤50 lignes via `.cursor/rules/ecosystem.mdc` |
| Skill | `.cursor/skills/timegate-ecosystem/` (versionné dans le repo) |
| Par package | `AGENTS.md` + `.skills/` (api d’abord, fronts ensuite) |
| Docs existants | `docs/` reste métier/pilote/specs — hub pointe, ne duplique pas |
| Rollout | Totale en 4 passes |

## Passes

1. ✅ Hub INDEX + glossary + projects + AGENTS + skill + rule
2. ✅ `integrations/` + `reference/`
3. ✅ `.skills/` riches `api/` + `docs:check` + routage `api/CLAUDE.md`
4. ✅ `.skills/` dashboard / console / employee-app / kiosk

**Statut :** implémenté (2026-09-04).
## Architecture

```
ecosystem-docs/
├── INDEX.md
├── glossary.md
├── integrations/
├── reference/
├── projects/
└── specs/

.cursor/skills/timegate-ecosystem/
.cursor/rules/ecosystem.mdc
AGENTS.md (racine + packages)
```

## Références

- Modèle Ride : `D:\Projects\ride-platform-docs`
- Skill Ride : `~/.cursor/skills/ride-ecosystem`
