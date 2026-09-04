---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: nest
audience: agents
---

# services-pattern

> Toute la logique métier + Prisma + `assertCompanyAccess` vit dans le service.

## Pattern

1. Charger l’entité
2. `assertCompanyAccess(user, entity.companyId)` (ou équivalent privé)
3. Muter / aggregater
4. Retourner DTO / shape stable

IDs métier : `generateDocId('LEAVE')` (`common/utils/doc-id.util.ts`).

Listes paginées :

```typescript
const [items, total] = await Promise.all([
  this.prisma.x.findMany({ where, skip, take, orderBy }),
  this.prisma.x.count({ where }),
]);
return { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
```

## Anti-patterns

- ❌ Skip access check sur update/delete
- ❌ Retourner un array nu pour une liste paginée
- ❌ Inventer des IDs hors `generateDocId` / DocIdPipe

## Liens

- Voir aussi : `prisma.md`, `multi-tenant.md`, `errors.md`

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
