# ecosystem-docs

Source de vérité **cross-package** pour le monorepo TimeGate (contexte agents + onboarding).

## Usage agents

1. Lire [`INDEX.md`](./INDEX.md) en premier (~50 lignes).
2. Charger `integrations/*` ou `reference/*` selon la tâche (table dans INDEX).
3. Puis `AGENTS.md` + `.skills/` du package ouvert.

## Structure

```
INDEX.md                    # Point d'entrée — toujours en premier
glossary.md                 # Termes métier
integrations/               # Flux cross-package
reference/                  # Cartes (env, modules, skills)
projects/                   # Fiche 1 page par package
specs/                      # Designs validés (ce système docs)
```

## Packages

| Package | Path |
|---------|------|
| api | `../api` |
| dashboard | `../dashboard` |
| console | `../console` |
| employee-app | `../employee-app` |
| kiosk-app | `../kiosk-app` |

## Maintenance

Mettre à jour ce hub quand un flux cross-package change (auth, face/kiosk, envelope, env).  
Les conventions locales restent dans chaque package (`.skills/`, docs techniques).  
Specs produit / pilote restent dans `../docs/`.
