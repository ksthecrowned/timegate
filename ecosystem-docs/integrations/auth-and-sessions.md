# Intégration — Auth & sessions

## Matrice login (`/api/v1/auth`)

| Acteur | Route | Client |
|--------|-------|--------|
| Org user (ADMIN/MANAGER/EMPLOYEE) | `POST /auth/login` (+ optionnel `sku`) | dashboard (ADMIN/MANAGER), parfois EMPLOYEE |
| Signup self-serve | `POST /auth/signup` | dashboard |
| Employee portal | `POST /auth/employee/identify` → `POST /auth/employee/login` | employee-app |
| PLATFORM_ADMIN | login console → session ; APIs `/auth/super-admin/*` | console |
| Kiosk bootstrap | `POST /auth/kiosk/bootstrap` | kiosk-app (opérateur) |
| Kiosk provision | `POST /auth/kiosk/provision` | ADMIN/MANAGER → JWT lifetime appareil |

## Tokens

- Login org : `{ access_token, refresh_token, expires_in }`
- Refresh : `POST /auth/refresh` body `{ refresh_token }`
- Logout : `POST /auth/logout`
- Profil : `GET /auth/me`, `PATCH /auth/me`, `PATCH /auth/me/password`
- Header : `Authorization: Bearer <jwt>`

## Rôles

| Rôle | Stockage | App principale |
|------|----------|----------------|
| `PLATFORM_ADMIN` | table `Admin` | console |
| `ADMIN` / `MANAGER` / `EMPLOYEE` | `User.timeGateRole` | dashboard / employee-app |
| Kiosk device | JWT provisionné `TimeGateKiosk` | kiosk-app |

**Authz** : `companyId` résolu côté serveur depuis la DB (JWT strategy) — ne jamais autoriser sur un `companyId` fourni par le client seul.

## Dashboards Next.js

| Aspect | dashboard | console |
|--------|-----------|---------|
| Port | 3000 | 3002 |
| NextAuth | Credentials | Credentials |
| `AUTH_SECRET` | dédié | **autre** secret dédié |
| Post-login | rôles company | refuse ≠ `PLATFORM_ADMIN` |

## Mobile

| App | Stockage token | Client HTTP |
|-----|----------------|-------------|
| employee-app | SecureStore | `lib/api.ts` (`EXPO_PUBLIC_API_URL`) |
| kiosk-app | stockage local JWT lifetime | `lib/timegate.ts` (`EXPO_PUBLIC_TIMEGATE_API_URL`) |

## Password reset

`POST /auth/forgot-password` → OTP mail → `verify-reset-code` → `reset-password`.

## Kiosk session ops

| Route | Auth |
|-------|------|
| `GET /auth/kiosk/config` | Kiosk Bearer |
| `POST /auth/kiosk/heartbeat` | Kiosk Bearer |
| `SSE /auth/kiosk/events` | Kiosk Bearer |

Voir aussi `face-and-kiosk.md`.
