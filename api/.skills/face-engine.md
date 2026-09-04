---
status: stable
last-verified: 2026-09-04
owner: timegate@api
scope: face
audience: agents
---

# face-engine

> Enroll dashboard → embeddings ; verify kiosk → Python worker + match company-scoped.

## Fichiers

| Path | Rôle |
|------|------|
| `face/face.controller.ts` | `POST /face/enroll`, `POST /face/add-face` (ADMIN) |
| `face/face-embedding.service.ts` | `embedFromBuffer`, `cosineSimilarity`, `mergeEmbeddings` |
| `python/face_engine.py` | Moteur |
| Verify | `AuthService.verifyMobilePhoto` + threshold |

## Env

`FACE_ENGINE_PYTHON_BIN`, `FACE_ENGINE_SCRIPT_PATH`, `FACE_ENGINE_TIMEOUT_MS`, `FACE_VERIFY_THRESHOLD` (défaut ~0.82)

## Règles

- Match **dans** la company du kiosk uniquement
- Retries verify : header `X-Idempotency-Key`
- Timeout obligatoire — ne pas bloquer Node sans limite

## Anti-patterns

- ❌ Matching cross-tenant
- ❌ Ignorer idempotency sur sync offline
- ❌ Assumer R2 toujours dispo pour la photo (upload soft-fail)

## Liens

- Hub : `docs/ecosystem/integrations/face-and-kiosk.md`
- Voir aussi : `storage-r2.md`

---

> **Mainteneur** : timegate@api — vérifier la fraîcheur tous les 90 jours.
> **Source de vérité** : le code, pas ce fichier.
