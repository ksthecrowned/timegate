---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: validation
audience: agents
---

# dtos-validation

> `class-validator` + `class-transformer` uniquement — **pas de zod** dans `api/`.

## Setup

`main.ts` — `ValidationPipe` global : `whitelist`, `forbidNonWhitelisted`, `transform`, `enableImplicitConversion`.

## Emplacement

- `src/<module>/dto/*.ts`
- Pagination partagée : `common/dto/pagination-query.dto.ts` (`page`, `limit` max 100, filtres optionnels)
- Updates : `PartialType` de `@nestjs/mapped-types`

## Pattern

```typescript
export class EmployeeQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(200) search?: string;
}
```

## Anti-patterns

- ❌ Introduire zod / Yup
- ❌ Body non décoré (champs inconnus rejetés par le pipe)
- ❌ Dupliquer pagination sans étendre `PaginationQueryDto`

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
