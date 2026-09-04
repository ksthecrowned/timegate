# AGENTS.md — kiosk-app

## Ecosystem

- **Index :** `../docs/ecosystem/INDEX.md`
- **Fiche :** `../docs/ecosystem/projects/kiosk-app.md`
- Face : `../docs/ecosystem/integrations/face-and-kiosk.md`

## Stack

- Expo / React Native / caméra + face-detector
- JWT kiosk lifetime — `EXPO_PUBLIC_TIMEGATE_API_URL`

## Commands

```bash
bun install
bun run start
# android | ios | typecheck | test
```

## Notes

- Flux : bootstrap → provision → verify / PIN / NFC / QR
- Heartbeat ~90s ; SSE events
- Device physique : URL LAN, cleartext HTTP en dev Android si besoin

## Do not

- Utiliser `EXPO_PUBLIC_API_URL` (c’est employee-app)
- Logger le JWT kiosk en clair dans les builds prod

## Skills (`.skills/`)

| Tâche | Fichiers |
|-------|----------|
| Client / JWT | `.skills/timegate-client.md` |
| Provision | `.skills/provisioning.md` |
| Face capture | `.skills/face-capture.md` |
| Hub | `.skills/ecosystem-pointer.md` |
