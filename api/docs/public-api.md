# TimeGate Public API (v1)

## Acces documentation interactive

- URL locale: `/api/v1/docs`
- Format: OpenAPI (Swagger UI)
- Auth: `Authorization: Bearer <jwt>`

## Conventions

- Base path API: `/api/v1`
- Dates: ISO-8601 UTC
- Header correlation: `X-Request-Id` (reponse) / `x-request-id` (requete optionnelle)
- Erreurs: format standard NestJS (`statusCode`, `message`, `error`)

## Domaines couverts

- Authentification et provisionnement kiosque
- Presence: `attendance/days`, `attendance/events`
- Timesheets: recalcul, override, consultation
- Notifications utilisateur
- Configuration tenant (`system-config/tenant`)

## Webhooks

Si les webhooks tenant sont actives:

- Header event: `x-timegate-event`
- Header timestamp: `x-timegate-timestamp`
- Header signature: `x-timegate-signature: sha256=<hmac>`

Signature calculee sur: `${timestamp}.${rawBody}` avec secret tenant (`webhookSecret`), algo `HMAC-SHA256`.
