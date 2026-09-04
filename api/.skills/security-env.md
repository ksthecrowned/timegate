---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: security
audience: agents
---

# security-env

## Secrets (env only)

`JWT_SECRET`, `DATABASE_URL`, `R2_*`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `MAIL_PASS`, webhook secrets.

- Templates : `.env.example` — **jamais** committer `.env` ni JSON service account
- Hub env : `ecosystem-docs/reference/env-vars.md`

## Authz

- `companyId` depuis DB (JWT strategy)
- Pas d’`eval` / `innerHTML` côté API
- Uploads : types/size contrôlés aux boundaries multipart

## Anti-patterns

- ❌ Hardcoder secrets dans le repo
- ❌ `rejectUnauthorized: false` en prod
- ❌ IDOR via IDs client

## Liens

- `.cursor/rules/security-guidance.mdc`

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
