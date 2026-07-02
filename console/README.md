# Console Plateforme

Application Next.js dédiée à la gestion **plateforme SaaS** TimeGate (organisations, plans, abonnements, référentiels).

- Port dev : **3002** (`http://localhost:3002`)
- Rôle requis : `SUPER_ADMIN` (connexion sans SKU organisation)

## Démarrage

```bash
bun install
cp .env.example .env.local   # renseigner AUTH_SECRET et l’URL API
bun run dev
```

Variables : voir `.env.example`.

Les routes API backend restent sous `/auth/super-admin/*` (nommage historique côté NestJS).
