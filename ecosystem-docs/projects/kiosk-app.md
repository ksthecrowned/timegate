# kiosk-app

## Rôle

App kiosk (tablette) — provisioning appareil, détection faciale live, verify serveur, feedback pointage. JWT kiosk lifetime.

## Stack

- Expo ~55, React Native, face-detector / caméra
- Client API : `lib/timegate.ts`

## Flux

1. Bootstrap opérateur → branches
2. Provision → JWT stocké
3. Capture → `POST /auth/kiosk/verify` (multipart)
4. Heartbeat ~90s ; SSE `/auth/kiosk/events`
5. Alternates : PIN, NFC, QR challenge

Détail : `../integrations/face-and-kiosk.md` + `README.md` du package.

## Env

- `EXPO_PUBLIC_TIMEGATE_API_URL` (LAN ; émulateur Android `10.0.2.2`)
- Cleartext HTTP autorisé en dev Android si besoin

## Commandes

```bash
cd kiosk-app
bun install
bun run start   # ou: bun run android
# ios | web | typecheck | test
```

## Hub

- Auth kiosk : `../integrations/auth-and-sessions.md`
- Face : `../integrations/face-and-kiosk.md`
