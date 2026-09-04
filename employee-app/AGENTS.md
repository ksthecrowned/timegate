# AGENTS.md — employee-app

## Ecosystem

- **Index :** `../ecosystem-docs/INDEX.md`
- **Fiche :** `../ecosystem-docs/projects/employee-app.md`
- Auth : `../ecosystem-docs/integrations/auth-and-sessions.md`

## Expo

Expo a évolué — lire les docs versionnées avant de coder :  
https://docs.expo.dev/versions/v56.0.0/

(`CLAUDE.md` → `@AGENTS.md`)

## Stack

- Expo / React Native / expo-router
- Token : SecureStore — `EXPO_PUBLIC_API_URL` (≠ nom env kiosk)

## Commands

```bash
bun install
bun run start
# android | ios | web | lint
```

## Notes

- Login : `/auth/employee/identify` + `/auth/employee/login`
- Portal API : `/employee/*`
- Ancien nom docs : `employee-web` — **obsolète**

## Do not

- Confondre avec `kiosk-app` (env URL différente)
- Committer secrets Google/Firebase hors besoin documenté

## Skills (`.skills/`)

| Tâche | Fichiers |
|-------|----------|
| API / token | `.skills/api-client.md` |
| Auth routes | `.skills/auth-routing.md` |
| QR punch | `.skills/qr-punch.md` |
| Hub | `.skills/ecosystem-pointer.md` |
