---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: storage
audience: agents
---

# storage-r2

> Uploads durables via Cloudflare R2 — filesystem Render **éphémère**.

## Service

`src/storage/cloudflare-r2.service.ts`

Env : `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`.  
Si manquant → client `null`, upload retourne `null` (warn).

## Helpers

`uploadEmployeePhoto`, `uploadRecognitionImage`, `uploadEmployeeContract`, `uploadCompanyLogo`, `uploadLeaveSupportDocument`, `uploadLateJustification`, `deleteByPublicUrl`

Souvent fourni dans le module feature (ex. EmployeesModule), pas un Nest module séparé obligatoire.

## Anti-patterns

- ❌ Écrire photos/contrats sur disque local pour la prod
- ❌ Hardcoder credentials
- ❌ Assumer qu’upload retourne toujours une URL

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
