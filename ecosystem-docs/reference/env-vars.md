# Variables d'environnement

Ne pas committer de `.env` locaux. Templates : `*/.env.example`.

## api

| Var | Rôle |
|-----|------|
| `DATABASE_URL` | PostgreSQL |
| `E2E_DATABASE_URL` | DB tests |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Auth |
| `PORT` | Défaut `4001` — bind `0.0.0.0` |
| `CORS_ORIGIN` | Ex. `http://localhost:3000,http://localhost:3002` (+ origins mobiles) |
| `FACE_ENGINE_PYTHON_BIN`, `FACE_ENGINE_SCRIPT_PATH`, `FACE_ENGINE_TIMEOUT_MS`, `FACE_VERIFY_THRESHOLD` | Face |
| `R2_*` | Photos Cloudflare R2 |
| `MAIL_*` | OTP reset password |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | FCM |
| `DATABASE_POOL_MAX`, `DUPLICATE_ATTENDANCE_WINDOW_SECONDS`, `TIMEGATE_ALLOW_CHECKIN_AFTER_BREAK_START` | Ops |

## dashboard / console

| Var | Notes |
|-----|-------|
| `NEXT_PUBLIC_TIMEGATE_API_URL` | Ex. `http://localhost:4001/api/v1` |
| `AUTH_SECRET` | **Unique par app** — ne pas partager dashboard↔console |
| `AUTH_URL` | Optionnel |
| Firebase web (dashboard) | Push navigateur si configuré |

## kiosk-app

| Var | Notes |
|-----|-------|
| `EXPO_PUBLIC_TIMEGATE_API_URL` | LAN IP sur device ; Android emu `10.0.2.2:4001` |

## employee-app

| Var | Notes |
|-----|-------|
| `EXPO_PUBLIC_API_URL` | **Nom différent** du kiosk |

## Render

Voir `render.yaml` (`rootDir: api`) — `PORT` fourni par la plateforme.
