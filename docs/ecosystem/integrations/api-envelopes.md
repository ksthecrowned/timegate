# Intégration — Enveloppes API

## Préfixe

Toutes les routes app : **`/api/v1`**. Swagger : `/api/v1/docs`.

## Succès — listes (typique)

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

## Auth tokens

```json
{
  "access_token": "…",
  "refresh_token": "…",
  "expires_in": 3600
}
```

## Erreurs (NestJS)

```json
{
  "statusCode": 400,
  "message": "…",
  "error": "Bad Request"
}
```

## Headers utiles

| Header | Usage |
|--------|--------|
| `Authorization: Bearer …` | JWT user / admin / kiosk |
| `X-Request-Id` | Corrélation |
| `X-Idempotency-Key` | Verify kiosk / retries |

## Webhooks sortants

Headers : `x-timegate-event`, `x-timegate-timestamp`, `x-timegate-signature: sha256=<hmac>`  
Payload signé : `${timestamp}.${rawBody}`.

## Source de vérité détaillée

- `../../api/docs/api-json-shapes.md`
- `../../api/docs/public-api.md`
- `../../api/EXAMPLES.http`

Toute modification d’enveloppe → MAJ ces docs **et** ce fichier.
