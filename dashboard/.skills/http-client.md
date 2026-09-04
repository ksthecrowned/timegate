---
status: stable
last-verified: 2026-09-04
owner: timegate@dashboard
scope: http
audience: agents
---

# http-client

## Pattern

```typescript
import { http } from '@/lib/http';
// Bearer depuis session NextAuth — voir docs/HTTP.md
```

- Domain helpers : `lib/timegate/*`
- Base URL : `NEXT_PUBLIC_TIMEGATE_API_URL`

## Anti-patterns

- ❌ `fetch` ad hoc sans passer par `http` (sauf cas documenté)
- ❌ Hardcoder `companyId` pour « sécuriser » une requête

---

> **Mainteneur** : timegate@dashboard — 90 jours.
> **Source de vérité** : le code.
