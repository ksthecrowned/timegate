---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: api
audience: agents
---

# api-envelope

## Préfixe

`/api/v1` — Swagger `/api/v1/docs`

## Listes

```json
{ "data": [], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }
```

Pas de helper partagé — reproduire `findMany` + `count` + `meta` dans le service.

## Auth tokens

`{ access_token, refresh_token, expires_in }`

## Headers

`Authorization: Bearer` · `X-Request-Id` · kiosk `X-Idempotency-Key`

## Anti-patterns

- ❌ Array nu pour listes paginées
- ❌ Changer l’enveloppe sans MAJ `docs/api-json-shapes.md` + hub `integrations/api-envelopes.md`

## Liens

- `docs/api-json-shapes.md`, `docs/public-api.md`, `EXAMPLES.http`

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
