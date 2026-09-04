# api

## Rôle

Backend central TimeGate — NestJS, Prisma, PostgreSQL, moteur facial Python. Point unique pour dashboard, console, employee-app et kiosk-app.

## Stack

- Bun, NestJS 10, Prisma 7, PostgreSQL
- JWT (user company + PLATFORM_ADMIN + kiosk device)
- Swagger : `http://localhost:4001/api/v1/docs`
- Face engine : `python/face_engine.py`

## Parle à

| Cible | Protocole |
|-------|-----------|
| dashboard, console | REST + Bearer JWT |
| employee-app | REST + Bearer JWT |
| kiosk-app | REST + Bearer kiosk JWT + SSE events |
| Face engine | process Python local |
| R2 / Firebase / SMTP | storage photos, FCM, OTP mail |

## Env vars

Voir `../reference/env-vars.md` — `DATABASE_URL`, `JWT_*`, `FACE_ENGINE_*`, `R2_*`, `CORS_ORIGIN`.

## Entry points code

| Chemin | Rôle |
|--------|------|
| `src/main.ts` | Bootstrap, préfixe `api/v1`, `0.0.0.0:$PORT` |
| `src/app.module.ts` | Registre modules |
| `prisma/schema.prisma` | Modèle données |
| `src/auth/` | Login, refresh, kiosk, super-admin |
| `src/face/` | Enroll / embeddings |
| `python/face_engine.py` | Moteur facial |

## Doc locale (ne pas dupliquer)

| Doc | Contenu |
|-----|---------|
| `docs/api-json-shapes.md` | Formes JSON listes / auth |
| `docs/public-api.md` | API publique / webhooks |
| `EXAMPLES.http` | Exemples REST |
| `docs/use-cases-test.md` | Campagne use-cases |

## Hub — quand lire quoi

| Tâche | Fichier hub |
|-------|-------------|
| Module à trouver | `../reference/api-module-map.md` |
| Auth / rôles | `../integrations/auth-and-sessions.md` |
| Face / kiosk | `../integrations/face-and-kiosk.md` |
| Envelope | `../integrations/api-envelopes.md` |

## Commandes

```bash
cd api
bun install
bun run prisma:generate
bun run start:dev
# bun run prisma:migrate | prisma:seed | test:use-cases | build
```

## Do not

- Faire confiance à `companyId` client pour l’authz (JWT strategy charge depuis DB)
- Exposer secrets R2 / Firebase / JWT côté apps
- Modifier l’enveloppe listes sans MAJ `api/docs/api-json-shapes.md` + hub
