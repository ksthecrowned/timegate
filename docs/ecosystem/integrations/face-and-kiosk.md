# Intégration — Face & kiosk

## Enroll (dashboard → API)

1. ADMIN upload photo employé : `POST /api/v1/face/enroll` (multipart `photo` + `employeeId`)
2. Embedding stocké sur `Employee` ; photo optionnelle R2
3. Fusion embeddings : `POST /face/add-face`

## Provisioning kiosk

1. `POST /auth/kiosk/bootstrap` — opérateur (admin/manager + SKU) → branches
2. `POST /auth/kiosk/provision` — JWT lifetime lié à `TimeGateKiosk` / branch
3. App stocke le token ; heartbeat ~90s : `POST /auth/kiosk/heartbeat`

## Verify (pointage facial)

1. Détection locale sur l’appareil
2. `POST /auth/kiosk/verify` — multipart `photo`, options `offlineSync`, `capturedAt`, geo, header `X-Idempotency-Key`
3. API → Python face engine → match employé **company-wide** (seuil `FACE_VERIFY_THRESHOLD`, défaut ~0.82)
4. Écrit log face + événement attendance (`KIOSK_ONLINE` / sync offline)

## Alternates

| Mode | Routes |
|------|--------|
| PIN | `POST /auth/kiosk/verify-pin` |
| NFC | `POST /auth/kiosk/verify-nfc` |
| QR challenge | kiosk `POST /auth/kiosk/qr-challenge` + `GET …/result` ; employé `POST /employee/qr-punch/scan` (trusted device) |

## Clients

| Package | Fichiers clés |
|---------|---------------|
| kiosk-app | `lib/timegate.ts`, README package |
| api | `src/auth/` (kiosk), `src/face/`, `python/face_engine.py` |
| employee-app | QR punch + trusted devices |
| dashboard | UI enroll employés |

## Env face (api)

`FACE_ENGINE_PYTHON_BIN`, `FACE_ENGINE_SCRIPT_PATH`, `FACE_ENGINE_TIMEOUT_MS`, `FACE_VERIFY_THRESHOLD`
