---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: swagger
audience: agents
---

# swagger

## Setup

`main.ts` — `DocumentBuilder` + `SwaggerModule.setup('api/v1/docs', …)` + bearer auth.

URL : `http://localhost:4001/api/v1/docs`

## État actuel

Peu/pas de `@ApiTags` / `@ApiOperation` sur les controllers — OpenAPI surtout **inféré** des routes + DTOs class-validator.

## Rules

- DTOs précis = meilleure doc auto
- Si on enrichit Swagger (décorateurs), le faire dans la même PR que l’endpoint
- Segmentation audience (admin vs employee vs kiosk) n’est **pas** multi-Swagger comme Ride — un seul `/docs`

## Anti-patterns

- ❌ Assumer une doc Swagger aussi riche que ride-api
- ❌ Documenter un endpoint dans un README sans qu’il existe dans le code

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
