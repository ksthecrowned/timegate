---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: nest
audience: agents
---

# module-pattern

> Un domaine = un dossier sous `src/<domain>/` enregistré dans `app.module.ts`.

## Quand l'utiliser

- Nouveau domaine métier ou feature Nest

## Pattern

```
src/<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  <domain>.service.ts
  dto/
  # optionnel: *-cron.service.ts
```

- Controllers fins ; logique dans services
- Préfixe global déjà `api/v1` (`main.ts`) — **ne pas** le remettre sur `@Controller`
- Exporter le service si d’autres modules en ont besoin
- Exemple simple : `src/leaves/` · plus riche : `src/employees/`

## Anti-patterns

- ❌ Logique métier dans le controller
- ❌ `@Controller('api/v1/…')`
- ❌ Module orphelin non importé dans `app.module.ts`

## Liens

- Carte : `docs/ecosystem/reference/api-module-map.md`
- Voir aussi : `controllers.md`, `dtos-validation.md`, `services-pattern.md`

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
