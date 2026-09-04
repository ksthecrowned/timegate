---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: errors
audience: agents
---

# errors

> Pas de `ExceptionFilter` custom — enveloppe Nest par défaut.

## Shape

```json
{ "statusCode": 400, "message": "…", "error": "Bad Request" }
```

## Pattern

Throw depuis les services : `BadRequestException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `UnauthorizedException`, `InternalServerErrorException`.

Parfois payload objet : `ForbiddenException({ … })`.

## Anti-patterns

- ❌ Avaler l’erreur et renvoyer `200` + message flou
- ❌ Ajouter un filter global qui change l’enveloppe **sans** ADR/docs/hub

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
