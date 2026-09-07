---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: bootstrap
audience: agents
---

# bootstrap-main

## `main.ts`

- Nest **Fastify** (`FastifyAdapter`) — bind `0.0.0.0` + `PORT` (défaut 4001) — requis Render
- `@fastify/multipart` enregistré au bootstrap
- Préfixe global `api/v1`
- `ValidationPipe` global (whitelist / forbidNonWhitelisted)
- Swagger `/api/v1/docs`
- CORS depuis `CORS_ORIGIN`
- `X-Request-Id` via hook Fastify `onRequest`
- Uploads : `FastifyFileInterceptor` + `@UploadedBinaryFile()` (`common/upload/`) — **pas** Multer / Express

## `app.module.ts`

Registre tous les modules domaine — ajouter tout nouveau module ici.

## Anti-patterns

- ❌ Écouter seulement `localhost` en prod (casse Render)
- ❌ Écrire des assets durables sur disque local (FS éphémère)
- ❌ Réintroduire `@nestjs/platform-express` / `FileInterceptor` Multer
- ❌ Écrire sur `req.file` (réservé par `@fastify/multipart`) — utiliser `req.uploadedFile`

## Liens

- Security rule repo : `.cursor/rules/security-guidance.mdc`
- Spec migration : `../docs/superpowers/specs/2026-09-07-api-fastify-migration-design.md`

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
