---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: tenant
audience: agents
---

# multi-tenant

> Company = tenant ; Branch = site. Path SaaS `organizationId` = `companyId`.

## Modèle

```
Company → Branch → Employee / Kiosk / …
User (ADMIN|MANAGER|EMPLOYEE) + scopes branches manager
PLATFORM_ADMIN hors User tenant
```

## Helpers

| Helper | Où |
|--------|-----|
| `requireCompanyId(user)` | `common/utils/company-scope.util.ts` |
| `assertCompanyAccess(user, companyId)` | **privé par service** (employees, leaves, kiosks…) — bypass PLATFORM_ADMIN, sinon égalité `user.companyId` |

## Pattern liste

```typescript
const companyId =
  user.role === PLATFORM_ADMIN ? undefined : user.companyId;
// Sur controllers ops : OperationalAccessGuard bloque déjà le platform admin
where: { ...(companyId ? { companyId } : {}) }
```

## Anti-patterns

- ❌ Modèle « Site » séparé — utiliser **Branch**
- ❌ `companyId` client pour authz
- ❌ `findMany` sans filtre company sur données tenant

## Liens

- Glossaire hub + `integrations/saas-console.md`

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
