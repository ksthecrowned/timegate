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
