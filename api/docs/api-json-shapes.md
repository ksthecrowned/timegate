# Formes JSON — API TimeGate v1

Référence des **formes JSON** exposées par l’API.  
Identifiants tenant : `companyId`, `branchId`, `kioskId`, `defaultShiftId` (pas d’alias legacy en sortie).

Base URL : `http://localhost:4001/api/v1` (dev).  
Doc interactive : `/api/v1/docs` (voir aussi `public-api.md`).

---

## JWT (dashboard / manager / admin)

Payload signé à la connexion (`POST /auth/login`) :

```json
{
  "sub": "USR-…",
  "email": "admin@example.com",
  "role": "ADMIN",
  "companyId": "COMP-…"
}
```

Token opérateur kiosk (`POST /auth/kiosk/bootstrap`) : même shape (`companyId`).
Token lifetime kiosk (`POST /auth/kiosk/provision`) : JWT kiosk (verify / heartbeat).

Les routes `/auth/mobile/*` restent disponibles comme alias deprecated.

Super-admin : URLs `/super-admin/organizations/:organizationId/…` — le paramètre de route vaut un `companyId`.

---

## Tenant & structure

### `GET /branches` — liste

```json
{
  "data": [
    {
      "id": "BR-…",
      "name": "Siège",
      "address": "1 rue Example",
      "timezone": "Europe/Paris",
      "companyId": "COMP-…",
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

### `GET /kiosks` — liste (filtre `?branchId=`)

```json
{
  "data": [
    {
      "id": "KSK-…",
      "name": "Borne accueil",
      "branchId": "BR-…",
      "companyId": "COMP-…",
      "shiftLocationId": null,
      "status": "ONLINE",
      "isActive": true,
      "lastSeenAt": "2026-05-21T08:00:00.000Z",
      "location": null,
      "createdAt": "…",
      "updatedAt": "…",
      "branch": { "id": "BR-…", "name": "Siège" }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

### `GET /shift-types` — plannings

```json
{
  "data": [
    {
      "id": "SHIFT-…",
      "name": "Journée standard",
      "branchId": "BR-…",
      "companyId": "COMP-…",
      "startTime": "1970-01-01T08:00:00.000Z",
      "endTime": "1970-01-01T17:00:00.000Z",
      "lateGraceMinutes": 5,
      "createdAt": "…",
      "branch": { "id": "BR-…", "name": "Siège" }
    }
  ],
  "meta": { "…": "…" }
}
```

---

## Employé

### `GET /employees/:id`

```json
{
  "id": "EMP-…",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "companyId": "COMP-…",
  "branchId": "BR-…",
  "defaultShiftId": "SHIFT-…",
  "departmentId": null,
  "designationId": null,
  "holidayListId": "HLIST-…",
  "isActive": true,
  "branch": { "id": "BR-…", "name": "Siège", "address": null },
  "defaultShift": { "id": "SHIFT-…", "name": "Journée standard", "branchId": "BR-…" },
  "createdAt": "…",
  "updatedAt": "…"
}
```

### `POST /employees` (extrait corps)

```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "branchId": "BR-…",
  "defaultShiftId": "SHIFT-…",
  "email": "ada@example.com",
  "isActive": true
}
```

---

## Pointage

### Check-in — `GET /attendance`, `POST /attendance`

```json
{
  "id": "CHK-…",
  "employeeId": "EMP-…",
  "kioskId": "KSK-…",
  "type": "CHECK_IN",
  "timestamp": "2026-05-21T08:01:00.000Z",
  "confidence": 1,
  "createdAt": "…",
  "employee": {
    "id": "EMP-…",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "branchId": "BR-…"
  },
  "kiosk": {
    "id": "KSK-…",
    "name": "Borne accueil",
    "branchId": "BR-…",
    "branch": { "id": "BR-…", "name": "Siège" }
  }
}
```

`POST /attendance` : `{ "employeeId", "kioskId", "type", "confidence", "timestamp?" }`.

### Événement canonique — `GET /attendance/events`

```json
{
  "id": "EVT-…",
  "companyId": "COMP-…",
  "branchId": "BR-…",
  "kioskId": "KSK-…",
  "employeeId": "EMP-…",
  "source": "KIOSK_ONLINE",
  "type": "CHECK_IN",
  "status": "ACCEPTED",
  "occurredAt": "2026-05-21T08:01:00.000Z",
  "receivedAt": "2026-05-21T08:01:01.000Z",
  "confidence": 0.92,
  "verificationRef": null,
  "idempotencyKey": null,
  "rejectReason": null,
  "meta": null,
  "createdAt": "…",
  "kiosk": { "id": "KSK-…", "name": "Borne accueil", "branchId": "BR-…", "branch": { "id": "BR-…", "name": "Siège" } },
  "branch": { "id": "BR-…", "name": "Siège" }
}
```

Filtres liste : `branchId`, `kioskId`, `employeeId`, `from`, `to`, `status`.

---

## Kiosk (app borne)

Routes principales sous `/auth/kiosk/*`. Alias deprecated : `/auth/mobile/*`.

### `POST /auth/kiosk/bootstrap`

```json
{
  "operator_token": "<jwt>",
  "branches": [
    { "id": "BR-…", "name": "Siège", "address": null, "timezone": "Europe/Paris" }
  ]
}
```

### `POST /auth/kiosk/provision`

Corps :

```json
{
  "branchId": "BR-…",
  "kioskId": "KSK-…",
  "deviceName": "Borne hall",
  "location": "Accueil"
}
```

Réponse :

```json
{
  "lifetime_token": "<jwt>",
  "kiosk": { "id": "KSK-…", "name": "Borne hall" }
}
```

---

## RH / paie (extrait)

| Ressource | Champ tenant |
|-----------|----------------|
| `/holidays` | `companyId`, `company?` |
| `/leaves`, `/late-records`, `/absences` | `companyId` |
| `/timesheets`, `/payroll-runs` | `companyId` |
| `/system-config`, `/subscriptions` | `companyId`, `company?` |

### `GET /holidays`

```json
{
  "id": "HOL-…",
  "companyId": "COMP-…",
  "holidayListId": "HLIST-…",
  "holidayListName": "COMP Holidays",
  "name": "Fête du travail",
  "date": "2026-05-01T00:00:00.000Z",
  "createdAt": "…",
  "company": { "id": "COMP-…", "name": "TimeGate Demo", "sku": "TMGT" }
}
```

---

## Routes & ressources à ne pas confondre

| Route | Rôle |
|-------|------|
| `/kiosks` | Bornes de pointage (`TimeGateKiosk`) |
| `/devices` | Tokens push mobile (`TimeGateDevice`) — **actif**, pas un alias kiosk |
| `/branches` | Succursales (pas `/sites`) |
| `/shift-types` | Plannings (pas `/work-schedules`) |

`POST /work-days` conserve le champ corps `scheduleId` (= id de `ShiftType`).

Ne pas envoyer en DTO : `organizationId`, `siteId`, `deviceId` (hors push `/devices`), `scheduleId` sur employé (utiliser `defaultShiftId`).

---

## Pagination commune

Query : `page`, `limit`, `branchId`, `kioskId`, `employeeId`, `from`, `to` (`PaginationQueryDto`).
