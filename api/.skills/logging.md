---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: logging
audience: agents
---

# logging

> Nest `Logger` standard — pas de couche Winston/Pino dédiée.

```typescript
private readonly logger = new Logger(MyService.name);
this.logger.log(…); this.logger.warn(…); this.logger.error(…);
```

- Corrélation : middleware `X-Request-Id` dans `main.ts`
- Face embed peut aussi logger `[TimeGateAPI][face-embed]`

## Anti-patterns

- ❌ Logger tokens JWT, secrets R2, webhook secrets, photos base64
- ❌ `console.log` massifs en prod hors debug face ciblé

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
