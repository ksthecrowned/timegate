---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: webhooks
audience: agents
---

# webhooks

## Service

`src/webhooks/webhooks.service.ts`

Signature :

```typescript
createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
// headers: x-timegate-event, x-timegate-timestamp, x-timegate-signature: sha256=…
```

Config : `timeGateSystemSettings` (`webhookEnabled`, `webhookUrl`, `webhookSecret`).  
Échec delivery → `Logger.warn`, pas de throw bloquant le flux métier.

## Liens

- `docs/public-api.md` · hub `integrations/api-envelopes.md`

## Anti-patterns

- ❌ POST sortant non signé
- ❌ Logger le secret webhook

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
