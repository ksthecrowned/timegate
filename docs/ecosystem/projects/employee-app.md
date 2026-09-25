# employee-app

## Rôle

App mobile employé (Expo) — pointages, congés, messages, QR punch vers kiosk. Remplace l’ancien **employee-web** (Next.js).

## Stack

- Expo ~57, React Native, expo-router
- Auth token : SecureStore
- API : `EXPO_PUBLIC_API_URL` (nom différent du kiosk)

## Auth / API

- `POST /auth/employee/identify` → `POST /auth/employee/login`
- Portal : préfixe `/employee/*` (`employee-portal/`, messaging, QR punch)
- Trusted device pour QR punch

## Env

- `EXPO_PUBLIC_API_URL` (ex. `http://<LAN>:4001/api/v1`)
- Fallback prod possible dans `lib/api.ts` si unset

## Commandes

```bash
cd employee-app
bun install
bun run start
# android | ios | web | lint
```

## Doc locale

- `AGENTS.md` / `CLAUDE.md` : pointer Expo versionnée + hub TimeGate
- Spec migration : `../superpowers/specs/2026-06-22-employee-app-migration-design.md`

## Hub

- `../integrations/auth-and-sessions.md`
- `../integrations/face-and-kiosk.md` (QR punch)
- `../integrations/attendance-and-planning.md`
- Self-service catch-up : `../../metier/employee-app-rattrapage.md` · spec `../../superpowers/specs/2026-09-25-employee-app-catchup-design.md`

## Portal self-service (2026-09-25)

| Endpoint | Usage app |
|----------|-----------|
| `GET /employee/home-insights` | Home cards (heures semaine, congés, paie, pending RH) |
| `GET /employee/colleagues` | Shift swap (plus `GET /employees`) |
| `GET /employee/timesheets` (+ `:id`) | Mes heures |
| `GET /employee/payroll/summary` (+ `lines/:id`) | Paie lecture seule (non-DRAFT) |
| `GET /employee/pending-hr` | Fil en attente RH |
| `GET /employee/punch-claims` | Liste réclamations |
