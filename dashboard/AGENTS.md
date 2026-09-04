# AGENTS.md — dashboard

## Ecosystem

- **Index :** `../docs/ecosystem/INDEX.md`
- **Fiche :** `../docs/ecosystem/projects/dashboard.md`
- Auth hub : `../docs/ecosystem/integrations/auth-and-sessions.md`

## Stack

- Next.js 15, NextAuth, Preline/Tailwind — port **3000**
- API : `NEXT_PUBLIC_TIMEGATE_API_URL` → Bearer JWT session

## Commands

```bash
bun install
bun run dev
bun run build
bun run lint
```

## Notes

- `AUTH_SECRET` **dédié** (≠ console)
- Rôles UI : ADMIN / MANAGER (EMPLOYEE possible selon `isDashboardRole`)
- Docs locales : `docs/AUTH.md`, `docs/HTTP.md`

## Do not

- Partager `AUTH_SECRET` avec console
- Hardcoder `companyId` côté client pour authz

## Skills (`.skills/`)

| Tâche | Fichiers |
|-------|----------|
| Auth | `.skills/auth-nextauth.md` |
| HTTP API | `.skills/http-client.md` |
| Rôles | `.skills/roles-access.md` |
| Hub | `.skills/ecosystem-pointer.md` |
