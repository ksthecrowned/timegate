# TimeGate — Espace employé (web)

Application web **mobile-first** pour les employés : pointages, soldes congés et demandes de congé.

Séparée du dashboard admin (`dashboard/`) et complémentaire à l’app kiosk Expo (`mobile-app/`).

## Prérequis

- API TimeGate en cours d’exécution (`api`, port **4001** par défaut)
- Compte utilisateur avec rôle **EMPLOYEE** lié à un profil employé actif

## Configuration

```bash
cd employee-web
cp .env.example .env
bun install   # ou npm install
bun run dev   # http://localhost:3001
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_TIMEGATE_API_URL` | Base API, ex. `http://127.0.0.1:4001/api/v1` |

## Parcours

1. **Login** — `POST /auth/employee/login` (email + mot de passe)
2. **Accueil** — profil, soldes congés, dernières demandes
3. **Pointages** — historique filtrable par période
4. **Congés** — nouvelle demande + historique

## Compte seed (démo)

- Email : `patrick.mukendi@sotrafer.cg`
- Mot de passe : `ChangeMe123!`

## Ports du monorepo

| App | Port |
|-----|------|
| Dashboard admin | 3000 |
| **Espace employé** | **3001** |
| API | 4001 |
