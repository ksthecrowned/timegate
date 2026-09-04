---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: meta
audience: agents
---

# `.skills/` — patterns à la demande

Ne jamais tout lire. Routage : [`../CLAUDE.md`](../CLAUDE.md).

## Frontmatter obligatoire

```yaml
---
status: stable | draft | deprecated
last-verified: YYYY-MM-DD
owner: timegate@api
scope: …
audience: agents
---
```

Validation : `bun run docs:check` (frontmatter + fraîcheur 90j).

Pied de page standard : mainteneur + « source de vérité = le code ».

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
