# API — Fastify migration

- [x] Validate: build + health + docs + use-cases  
  Spec: `docs/superpowers/specs/2026-09-07-api-fastify-migration-design.md`  
  Result: `143` use-cases OK (2026-09-07); health/docs 200
- [ ] Optional smoke: logo upload + face enroll + SSE kiosk on device

# Dette technique

## Face engine — remplacer `face_recognition` / dlib

- [ ] Migrer le moteur facial vers une lib plus récente et maintenue (ex. InsightFace / équivalent)

**Pourquoi :** `face_recognition` + `face_recognition_models` sont peu maintenus. `face_recognition_models` importe encore `pkg_resources` (API Setuptools dépréciée, retrait prévu ~nov 2025). Pin actuel `setuptools>=65,<81` dans `api/python/requirements.txt` — mitigation temporaire, pas une solution.

**Impact :** enroll dashboard, verify kiosk, worker Python (`api/python/face_engine.py`), embeddings stockés, seuil `FACE_VERIFY_THRESHOLD`. Probable ré-enroll des employés si la dimension / l’espace des vecteurs change.

**Docs :** `docs/ecosystem/integrations/face-and-kiosk.md` · `api/.skills/face-engine.md`
