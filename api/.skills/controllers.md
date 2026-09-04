---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: nest
audience: agents
---

# controllers

> Controllers fins + guards + `@Roles` ; DTOs typés.

## Pattern

```typescript
@Controller('leaves')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class LeavesController {
  @Roles(TimeGateUserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateLeaveDto, @CurrentUser() user: JwtUser) {
    return this.leavesService.create(dto, user);
  }
}
```

## Conventions

- Un controller principal par domaine ; parfois plusieurs (`employee-portal`, messaging)
- Params `:id` souvent via `DocIdPipe`
- Listes : query DTO extends `PaginationQueryDto` → service renvoie `{ data, meta }`

## Anti-patterns

- ❌ Business logic / Prisma dans le controller
- ❌ Oublier `OperationalAccessGuard` sur modules RH tenant
- ❌ Routes login/kiosk sans `@Public()` alors que JWT global bloque

## Liens

- Voir aussi : `auth-guards.md`, `dtos-validation.md`, `api-envelope.md`

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
