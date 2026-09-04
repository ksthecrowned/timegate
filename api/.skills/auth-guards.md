---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: auth
audience: agents
---

# auth-guards

> Guards globaux JWT + rôles ; kiosk = JWT device `@Public()` + validation service.

## Fichiers

| Pièce | Path |
|-------|------|
| APP_GUARD | `auth/auth.module.ts` → `JwtAuthGuard`, `RolesGuard`, `SubscriptionStateGuard` |
| JWT strategy | `auth/strategies/jwt.strategy.ts` — `companyId` **depuis DB uniquement** |
| `@Roles` / `@Public` / `@CurrentUser` | `common/decorators/` |
| `PLATFORM_ADMIN` | `common/constants/platform-admin.ts` |
| Ops tenant | `common/guards/operational-access.guard.ts` |

## Rôles

| Acteur | Mécanisme |
|--------|-----------|
| `PLATFORM_ADMIN` | table `Admin`, `kind: 'admin'`, `companyId: null` |
| `ADMIN` \| `MANAGER` \| `EMPLOYEE` | `User.timeGateRole` |
| Kiosk | JWT `typ: 'mobile_device'` / `kioskId` — routes `/auth/kiosk/*` souvent `@Public()` puis validées dans `AuthService` |

## Pattern

```typescript
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
@Roles(TimeGateUserRole.ADMIN)
@Post()
create(@Body() dto: CreateXDto, @CurrentUser() user: JwtUser) { … }
```

`OperationalAccessGuard` : **interdit** au platform admin d’accéder aux données ops tenant (employees, leaves…).

## Anti-patterns

- ❌ Autoriser via `companyId` du body/query client (IDOR)
- ❌ Traiter le kiosk comme un rôle Nest `ADMIN`
- ❌ Laisser `PLATFORM_ADMIN` CRUD sur routes ops tenant

## Liens

- Hub : `ecosystem-docs/integrations/auth-and-sessions.md`
- Voir aussi : `multi-tenant.md`

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
