# dashboard

## Rôle

Back-office Next.js pour ADMIN / MANAGER (RH, employés, planning, paie, logs face, kiosks).

## Stack

- Next.js 15, NextAuth (Credentials), Preline / Tailwind
- Port **3000**

## Auth

- Login → API `POST /auth/login` (+ SKU)
- Session NextAuth ; appels API Bearer via `lib/http` + `lib/auth/timegate-auth.ts`
- `AUTH_SECRET` **propre au dashboard** (ne pas partager avec console)

## Env

- `NEXT_PUBLIC_TIMEGATE_API_URL=http://localhost:4001/api/v1`
- `AUTH_SECRET`
- Optionnel : Firebase web push, `NEXT_PUBLIC_CONSOLE_URL`

## Commandes

```bash
cd dashboard
bun install
bun run dev
# build | lint | test:tour
```

## Hub

- Auth : `../integrations/auth-and-sessions.md`
- Face enroll UI → `../integrations/face-and-kiosk.md`
