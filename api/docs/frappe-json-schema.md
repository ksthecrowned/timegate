# Schéma JSON canonique — API TimeGate 1.2.0 (vocabulaire Frappe)

Référence des **formes JSON** exposées par l’API après migration vocabulaire (`plan-vocabulaire-frappe.md`).  
Les champs legacy (`organizationId`, `siteId`, `deviceId` en sortie, `scheduleId` employé) ne sont **plus** renvoyés.

Base URL : `http://localhost:4001/api/v1` (dev).

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

**Coupure** : les tokens émis avant la migration (claim `organizationId`) sont invalides côté clients — **reconnexion obligatoire**.

Token mobile opérateur (`POST /auth/mobile/bootstrap`) : même shape (`companyId`).

Token lifetime kiosk (`POST /auth/mobile/provision`) : JWT kiosk (usage interne verify/heartbeat).

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

### Check-in legacy — `GET /attendance`, `POST /attendance`

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

## Mobile kiosk

### `POST /auth/mobile/bootstrap`

```json
{
  "operator_token": "<jwt>",
  "branches": [
    { "id": "BR-…", "name": "Siège", "address": null, "timezone": "Europe/Paris" }
  ]
}
```

### `POST /auth/mobile/provision`

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

## Routes retirées (404)

| Ancienne route | Remplacement |
|----------------|--------------|
| `/sites` | `/branches` |
| `/devices` | `/kiosks` |
| `/work-schedules` | `/shift-types` |

---

## DTO entrée — champs retirés

Ne plus envoyer : `organizationId`, `siteId`, `deviceId` (sauf colonne Prisma interne non exposée), `scheduleId` sur employé (utiliser `defaultShiftId`).

**Exception** : `POST /work-days` conserve `scheduleId` (= `shiftTypeId` en base).

Super-admin : URLs `/super-admin/organizations/:organizationId/…` — paramètre de route historique, valeur = `companyId`.

---

## Pagination commune

Query : `page`, `limit`, `branchId`, `kioskId`, `employeeId`, `from`, `to` (`PaginationQueryDto`).
