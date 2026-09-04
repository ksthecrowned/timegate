# TimeGate — Dashboard admin

Backoffice web Next.js 15 pour les équipes admin / RH TimeGate (port **3000**).

## Prérequis

- API TimeGate (`api`, port **4001** par défaut)
- Compte **ADMIN** ou **MANAGER** + SKU organisation (ex. `SOTR` après seed)

## Installation

```bash
cd dashboard
cp .env.example .env
bun install
bun run dev
```

## Configuration

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_TIMEGATE_API_URL` | Base API, ex. `http://localhost:4001/api/v1` |
| `AUTH_SECRET` | Secret NextAuth (générer une valeur aléatoire) |

## Comptes seed (démo)

| Rôle | Email | Mot de passe | SKU |
|------|-------|--------------|-----|
| ADMIN | `admin@sotrafer.cg` | `ChangeMe123!` | `SOTR` |
| MANAGER | `manager@sotrafer.cg` | `ChangeMe123!` | `SOTR` |

## Scripts

| Commande | Description |
|----------|-------------|
| `bun run dev` | Serveur de développement |
| `bun run build` | Build production |
| `bun run start` | Serveur production |
| `bun run lint` | ESLint |

## Structure

```
dashboard/
├── app/(authenticated)/   # Pages protégées (RH, présence, paie…)
├── components/            # Layout, UI, modules TimeGate
└── lib/timegate/          # Clients API et types
```

Voir le README racine du monorepo pour l’architecture complète (`api`, `employee-web`, `mobile-app`).
