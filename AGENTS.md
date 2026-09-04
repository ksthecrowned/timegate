# AGENTS.md — TimeGate (monorepo)

## Ecosystem

- **Index :** [`docs/ecosystem/INDEX.md`](./docs/ecosystem/INDEX.md)
- **Skill Cursor :** [`.cursor/skills/timegate-ecosystem/`](./.cursor/skills/timegate-ecosystem/)
- **Rule :** [`.cursor/rules/ecosystem.mdc`](./.cursor/rules/ecosystem.mdc)

## Packages

| Package | Path | Port |
|---------|------|------|
| api | `api/` | 4001 `/api/v1` |
| dashboard | `dashboard/` | 3000 |
| console | `console/` | 3002 |
| employee-app | `employee-app/` | Expo |
| kiosk-app | `kiosk-app/` | Expo |

## Démarrage de session

1. Lire `docs/ecosystem/INDEX.md`
2. Charger 1–2 fichiers hub selon la tâche
3. Ouvrir `AGENTS.md` du package concerné
4. Ne pas explorer large `node_modules` / `docs/jibc-*` / PDF marketing

## Stack (vue d’ensemble)

- API : NestJS + Prisma + PostgreSQL + Python face engine
- Web : Next.js (dashboard, console)
- Mobile : Expo (employee-app, kiosk-app)
- Package manager : Bun

## Fin de tâche

Flux cross-package (auth, face, envelope, env) modifié → proposer MAJ `docs/ecosystem/`.

## Docs hors hub

- Pilote : `docs/pilot/`
- Specs features : `docs/superpowers/`
- Backlog : `TODOS.md`
