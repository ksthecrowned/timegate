# QR Punch Employee Scans Kiosk — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le pointage QR « employé affiche / kiosk scanne » par « kiosk affiche un challenge / employé scanne », avec support offline (file téléphone → sync + TRUSTED strict).

**Architecture:** Secret HMAC par kiosk (`qrChallengeSecret`). Payload `TGQR:v3:{kioskId}:{slot}:{nonce}:{mac}`. Redeem online via `POST /employee/qr-punch/scan` ; offline via file employee-app + `POST /employee/qr-punch/sync`. Résultat kiosk via poll. Réutilise `resolveAttendancePunch` / recorder existants avec `AuthMethod.QR`.

**Tech Stack:** NestJS, Prisma, Expo (employee-app + kiosk-app), `expo-camera` / barcode scanner, SecureStore.

## Global Constraints

- Spec source: `docs/superpowers/specs/2026-07-25-qr-punch-employee-scans-kiosk-design.md` (approuvée).
- Remplacement **total** de l’ancien flux (pas de dual-mode).
- **Pas de GPS** en v1.
- Scan + sync exigent appareil **`TRUSTED`** (vérifié **au sync**, strict).
- TTL challenge ~45–60 s ; anti-rejeu nonce one-shot.
- Offline age max = `offlineSyncMaxAgeMinutes` tenant (défaut 720).
- Commits fréquents, un commit par tâche.
- Ne pas committer `.env` / secrets.

---

## File Map

| File | Responsibility |
|------|----------------|
| `api/prisma/schema.prisma` | `TimeGateKiosk.qrChallengeSecret` ; model `TimeGateQrChallenge` ; deprecate employee secrets |
| `api/src/common/utils/kiosk-qr-challenge.util.ts` | Build/parse/verify `TGQR:v3` |
| `api/src/common/utils/kiosk-qr-challenge.util.spec.ts` | Unit tests crypto |
| `api/src/auth/auth.service.ts` | Provision secret ; challenge create/result ; remove `verifyQr` employé |
| `api/src/auth/auth.controller.ts` | Routes mobile challenge ; remove verify-qr |
| `api/src/employee-portal/employee-portal.service.ts` | `scanQrChallenge` + `syncQrChallenges` |
| `api/src/employee-portal/employee-portal.controller.ts` | scan/sync ; remove `qr-punch/current` |
| `api/src/employees/employees.service.ts` | Remove issue/revoke employee QR secret APIs |
| `dashboard/components/timegate/EmployeeQrPunchCard.tsx` | Remove or replace (no employee secret) |
| `kiosk-app/app/qr.tsx` | Display QR + poll (no camera) |
| `kiosk-app/lib/qr-challenge.ts` | Local offline challenge + API online |
| `employee-app/app/qr-scan.tsx` (rename from qr-punch) | Camera scanner |
| `employee-app/lib/qr-offline-queue.ts` | Offline enqueue/sync |
| `employee-app/lib/api.ts` | Client scan/sync |

---

### Task 1: Crypto util `TGQR:v3` + unit tests

**Files:**
- Create: `api/src/common/utils/kiosk-qr-challenge.util.ts`
- Create: `api/src/common/utils/kiosk-qr-challenge.util.spec.ts` (ou script `node --test` si pas de jest — préférer fichier test exécutable avec `bun test` / `node --import tsx --test` selon tooling repo ; sinon test via petit script `api/scripts/test-kiosk-qr-challenge.mjs` important la logique dupliquée minimale — **préféré si aucun runner jest** : garder util pur et valider avec `bun -e` assertions dans la tâche)
- Keep temporarily: `api/src/common/utils/qr-punch-token.util.ts` until Task 5 removes callers

**Interfaces:**
- Produces:
  - `KIOSK_QR_PREFIX = 'TGQR:v3:'`
  - `KIOSK_QR_SLOT_MS = 45_000`
  - `generateKioskQrChallengeSecret(): string`
  - `buildKioskQrChallengePayload(kioskId, secret, at?): { payload, slot, nonce, expiresAt }`
  - `parseKioskQrChallengePayload(raw): { kioskId, slot, nonce, mac } | null`
  - `verifyKioskQrChallengePayload(parsed, secret, referenceAt): boolean`

- [ ] **Step 1: Implement util**

```typescript
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export const KIOSK_QR_PREFIX = 'TGQR:v3:';
export const KIOSK_QR_SLOT_MS = 45_000;

export function kioskQrSlot(at: Date): number {
  return Math.floor(at.getTime() / KIOSK_QR_SLOT_MS);
}

export function generateKioskQrChallengeSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function buildKioskQrMac(
  kioskId: string,
  slot: number,
  nonce: string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(`${kioskId}:${slot}:${nonce}`)
    .digest('base64url')
    .slice(0, 16);
}

export function buildKioskQrChallengePayload(
  kioskId: string,
  secret: string,
  at = new Date(),
): { payload: string; slot: number; nonce: string; expiresAt: Date } {
  const slot = kioskQrSlot(at);
  const nonce = randomBytes(8).toString('base64url');
  const mac = buildKioskQrMac(kioskId, slot, nonce, secret);
  return {
    payload: `${KIOSK_QR_PREFIX}${kioskId}:${slot}:${nonce}:${mac}`,
    slot,
    nonce,
    expiresAt: new Date((slot + 1) * KIOSK_QR_SLOT_MS),
  };
}

export function parseKioskQrChallengePayload(raw: string): {
  kioskId: string;
  slot: number;
  nonce: string;
  mac: string;
} | null {
  const match = /^TGQR:v3:([^:]+):(\d+):([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/i.exec(raw.trim());
  if (!match) return null;
  const slot = Number(match[2]);
  if (!Number.isFinite(slot)) return null;
  return { kioskId: match[1], slot, nonce: match[3], mac: match[4] };
}

export function verifyKioskQrChallengePayload(
  parsed: { kioskId: string; slot: number; nonce: string; mac: string },
  secret: string,
  referenceAt: Date,
): boolean {
  const ref = kioskQrSlot(referenceAt);
  const slots = [...new Set([ref, ref - 1, ref + 1, parsed.slot])];
  return slots.some((slot) => {
    const expected = buildKioskQrMac(parsed.kioskId, slot, parsed.nonce, secret);
    if (expected.length !== parsed.mac.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(parsed.mac));
  });
}
```

- [ ] **Step 2: Smoke-test**

Run:

```bash
cd api && bun -e "
const u = require('./dist-not-needed');
"
```

Prefer inline:

```bash
cd api && bun -e "
import {
  generateKioskQrChallengeSecret,
  buildKioskQrChallengePayload,
  parseKioskQrChallengePayload,
  verifyKioskQrChallengePayload,
} from './src/common/utils/kiosk-qr-challenge.util.ts';
const secret = generateKioskQrChallengeSecret();
const { payload } = buildKioskQrChallengePayload('KIOSK1', secret);
const parsed = parseKioskQrChallengePayload(payload);
if (!parsed || !verifyKioskQrChallengePayload(parsed, secret, new Date())) throw new Error('fail');
console.log('ok', payload);
"
```

Expected: `ok TGQR:v3:...`

- [ ] **Step 3: Commit**

```bash
git add api/src/common/utils/kiosk-qr-challenge.util.ts
git commit -m "feat(api): add TGQR:v3 kiosk challenge crypto util"
```

---

### Task 2: Prisma — secret kiosk + table challenge

**Files:**
- Modify: `api/prisma/schema.prisma` (`TimeGateKiosk` + new model)
- Create migration via `bunx prisma migrate dev`

**Interfaces:**
- Produces DB:
  - `TimeGateKiosk.qrChallengeSecret String? @map("qr_challenge_secret") @db.VarChar(88)`
  - Model `TimeGateQrChallenge`:
    - `id`, `kioskId`, `nonce` (unique with kioskId), `slot`, `payloadHash`, `expiresAt`
    - `redeemedAt DateTime?`, `employeeId String?`, `clientId String?` (offline idempotency)
    - `resultJson Json?` (poll payload)
    - `createdAt`

- [ ] **Step 1: Update schema**

Add on `TimeGateKiosk` after `qrEnabled`:

```prisma
  qrChallengeSecret String? @map("qr_challenge_secret") @db.VarChar(88)
```

Add model:

```prisma
model TimeGateQrChallenge {
  id          String    @id @db.VarChar(140)
  createdAt   DateTime  @default(now())
  kioskId     String    @map("kiosk") @db.VarChar(140)
  kiosk       TimeGateKiosk @relation(fields: [kioskId], references: [id], onDelete: Cascade)
  nonce       String    @db.VarChar(32)
  slot        Int
  payloadHash String    @map("payload_hash") @db.VarChar(64)
  expiresAt   DateTime  @map("expires_at")
  redeemedAt  DateTime? @map("redeemed_at")
  employeeId  String?   @map("employee") @db.VarChar(140)
  clientId    String?   @map("client_id") @db.VarChar(140)
  resultJson  Json?     @map("result_json")

  @@unique([kioskId, nonce])
  @@unique([clientId])
  @@index([kioskId, expiresAt])
  @@map("timegate_qr_challenge")
}
```

Add relation `qrChallenges TimeGateQrChallenge[]` on `TimeGateKiosk`.

Keep `Employee.qrPunchSecret*` until Task 5.

- [ ] **Step 2: Migrate**

```bash
cd api && bunx prisma migrate dev --name kiosk_qr_challenge_v3
bunx prisma generate
```

Expected: migration applied, client generated.

- [ ] **Step 3: Commit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations
git commit -m "feat(api): add kiosk QR challenge secret and redeem table"
```

---

### Task 3: API kiosk — provision secret + create/poll challenge

**Files:**
- Modify: `api/src/auth/auth.service.ts` (`provisionMobile`, new methods)
- Modify: `api/src/auth/auth.controller.ts`
- Create: `api/src/auth/dto/mobile-qr-challenge.dto.ts` (empty body OK)

**Interfaces:**
- Produces:
  - `provisionMobile` returns `features` + ensure `qrChallengeSecret` set when missing; include `qrChallengeSecret` **plaintext once** in provision response for kiosk secure store (only at provision — document carefully). Alternative safer: return secret only when newly generated.
  - `createQrChallenge(token) → { id, payload, expiresAt, nonce }`
  - `getQrChallengeResult(token, challengeId) → { status: 'PENDING'|'REDEEMED'|'EXPIRED', result?: object }`

- [ ] **Step 1: On provision, ensure secret**

In `provisionMobile`, when updating kiosk:

```typescript
let qrChallengeSecret = /* load existing */;
if (!qrChallengeSecret) {
  qrChallengeSecret = generateKioskQrChallengeSecret();
}
// persist qrChallengeSecret
// return to kiosk only if newly created OR always on provision (device re-pair):
return { ..., qrChallengeSecret };
```

Kiosk stores in SecureStore as `kiosk_qr_challenge_secret`.

- [ ] **Step 2: createQrChallenge**

```typescript
async createQrChallenge(token: string) {
  const payload = await this.verifyMobileToken(token);
  const kiosk = await this.prisma.timeGateKiosk.findUnique({
    where: { id: payload.kioskId },
    select: { id: true, qrEnabled: true, qrChallengeSecret: true, isActive: true },
  });
  if (!kiosk?.qrEnabled || !kiosk.isActive) throw new ForbiddenException('QR disabled');
  if (!kiosk.qrChallengeSecret) throw new BadRequestException('QR challenge secret missing — re-provision');

  const built = buildKioskQrChallengePayload(kiosk.id, kiosk.qrChallengeSecret);
  const id = generateDocId('QRC');
  const payloadHash = createHash('sha256').update(built.payload).digest('hex');
  await this.prisma.timeGateQrChallenge.create({
    data: {
      id,
      kioskId: kiosk.id,
      nonce: built.nonce,
      slot: built.slot,
      payloadHash,
      expiresAt: built.expiresAt,
    },
  });
  return { id, payload: built.payload, expiresAt: built.expiresAt, nonce: built.nonce };
}
```

- [ ] **Step 3: getQrChallengeResult**

Return PENDING if not redeemed and not expired; EXPIRED if past expiresAt and not redeemed; REDEEMED + `resultJson` otherwise.

- [ ] **Step 4: Controller routes**

```typescript
@Public()
@Post('kiosk/qr-challenge')
createQrChallenge(@Headers('authorization') authorization?: string) {
  return this.auth.createQrChallenge(this.extractBearerToken(authorization));
}

@Public()
@Get('kiosk/qr-challenge/:challengeId/result')
getQrChallengeResult(
  @Param('challengeId', DocIdPipe) challengeId: string,
  @Headers('authorization') authorization?: string,
) {
  return this.auth.getQrChallengeResult(this.extractBearerToken(authorization), challengeId);
}
```

- [ ] **Step 5: Manual smoke**

Provision or use existing kiosk token → POST challenge → see `TGQR:v3:` payload.

- [ ] **Step 6: Commit**

```bash
git add api/src/auth
git commit -m "feat(api): kiosk QR challenge create and result poll"
```

---

### Task 4: API employee — scan + sync redeem

**Files:**
- Modify: `api/src/employee-portal/employee-portal.controller.ts`
- Modify: `api/src/employee-portal/employee-portal.service.ts`
- Create: `api/src/employee-portal/dto/scan-qr-challenge.dto.ts`
- Create: `api/src/employee-portal/dto/sync-qr-challenges.dto.ts`
- Possibly extract punch finalize helper shared with auth QR path — prefer calling into a small service used by portal that mirrors `finalizeCredentialVerification` fields (kiosk, employee, authMethod QR, offlineSync, capturedAt).

**Interfaces:**
- Consumes: `build/parse/verify` from Task 1; `TimeGateQrChallenge` from Task 2; `TrustedDeviceGuard` + `@RequireTrustedDevice`
- Produces:
  - `POST /employee/qr-punch/scan` body `{ payload: string }`
  - `POST /employee/qr-punch/sync` body `{ items: [{ clientId, payload, scannedAt }] }` → `{ results: [{ clientId, ok, errorCode?, punch? }] }`

- [ ] **Step 1: DTOs**

```typescript
// scan-qr-challenge.dto.ts
export class ScanQrChallengeDto {
  @IsString()
  @MinLength(10)
  payload!: string;
}

// sync-qr-challenges.dto.ts
export class SyncQrChallengeItemDto {
  @IsString() clientId!: string;
  @IsString() payload!: string;
  @IsISO8601() scannedAt!: string;
}
export class SyncQrChallengesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncQrChallengeItemDto)
  items!: SyncQrChallengeItemDto[];
}
```

- [ ] **Step 2: Core redeem logic** (service method)

Pseudo-order for one redeem:

1. If `user.deviceTrust !== 'TRUSTED'` → already blocked by guard; defense-in-depth check OK.
2. `parseKioskQrChallengePayload` — else `INVALID_PAYLOAD`
3. Load kiosk by id: same `companyId` as employee, `qrEnabled`, `qrChallengeSecret`
4. `verifyKioskQrChallengePayload` with `referenceAt = scannedAt ?? now` — else `INVALID_OR_EXPIRED`
5. If offline: check `now - scannedAt <= offlineSyncMaxAgeMinutes`
6. Find challenge by `(kioskId, nonce)`:
   - If missing and online create-path expected: for **offline-generated** payloads, **create-on-redeem** row if MAC ok (upsert) then redeem
   - If already `redeemedAt` → `ALREADY_USED` (idempotent success if same `clientId`/`employeeId`)
7. Transaction: set redeemed, call punch recorder with `TimeGateAttendanceAuthMethod.QR`, `source` appropriate, `kioskId`, `capturedAt: scannedAt`
8. Store `resultJson` for kiosk poll (employee name, event type, message)

**Important:** Online challenges created by kiosk have DB rows. Offline kiosk-generated challenges may not — implement **create-on-first-redeem** when MAC valid and no row exists.

- [ ] **Step 3: Controller**

Replace `GET qr-punch/current` with:

```typescript
@Post('qr-punch/scan')
@RequireTrustedDevice()
scanQr(@CurrentUser() user: JwtUser, @Body() dto: ScanQrChallengeDto) {
  return this.portal.scanQrChallenge(user, dto);
}

@Post('qr-punch/sync')
@RequireTrustedDevice()
syncQr(@CurrentUser() user: JwtUser, @Body() dto: SyncQrChallengesDto) {
  return this.portal.syncQrChallenges(user, dto);
}
```

- [ ] **Step 4: Manual test**

1. TRUSTED employee + live challenge → scan → attendance event QR
2. PENDING employee → 403
3. Replay same payload → ALREADY_USED
4. Sync item with old scannedAt beyond max age → rejected

- [ ] **Step 5: Commit**

```bash
git add api/src/employee-portal
git commit -m "feat(api): employee QR challenge scan and offline sync"
```

---

### Task 5: Remove old employee-QR / kiosk camera verify-qr

**Files:**
- Modify: `api/src/auth/auth.controller.ts` — remove `POST mobile/verify-qr`
- Modify: `api/src/auth/auth.service.ts` — remove `verifyQr` employee-secret path
- Modify: `api/src/employee-portal/*` — remove `getCurrentQrPunchPayload`
- Modify: `api/src/employees/*` — remove issue/revoke/getCurrent employee QR secret endpoints
- Modify: `dashboard/components/timegate/EmployeeQrPunchCard.tsx` + parent usage — remove UI
- Modify: `api/prisma/schema.prisma` — drop `Employee.qrPunchSecret` + `qrPunchSecretIssuedAt` (migration)
- Delete or stop using: `api/src/common/utils/qr-punch-token.util.ts`, `mobile-verify-qr.dto.ts`

- [ ] **Step 1: Remove API routes/services + dashboard card**
- [ ] **Step 2: Migration drop employee QR columns**

```bash
cd api && bunx prisma migrate dev --name drop_employee_qr_punch_secret
```

- [ ] **Step 3: `bunx tsc --noEmit -p tsconfig.json`** — Expected: clean
- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: remove employee personal QR punch flow"
```

---

### Task 6: Kiosk app — display challenge QR + poll

**Files:**
- Rewrite: `kiosk-app/app/qr.tsx`
- Create: `kiosk-app/lib/qr-challenge.ts`
- Modify: `kiosk-app/lib/timegate.ts` — provision stores `qrChallengeSecret`; API helpers
- Modify: `kiosk-app/lib/offline-verify-queue.ts` — update comment (QR no longer camera verify)

**Interfaces:**
- Online: `createQrChallenge()` → show `react-native-qrcode-svg` → poll result every 1.5s → success/error UI
- Offline: build payload locally with stored secret (same util algorithm ported to JS in `qr-challenge.ts`)

- [ ] **Step 1: Port crypto helpers to kiosk TS** (mirror Task 1 algorithm exactly)
- [ ] **Step 2: Rewrite `qr.tsx`** — no CameraView; show QR + countdown to `expiresAt`; on redeem success show MessageBox
- [ ] **Step 3: On expire, auto-refresh new challenge**
- [ ] **Step 4: Manual on device** — mode QR shows code; employee scan (Task 7) completes
- [ ] **Step 5: Commit**

```bash
git commit -m "feat(kiosk): display rotating QR challenge instead of camera scan"
```

---

### Task 7: Employee-app — scanner + offline queue

**Files:**
- Replace: `employee-app/app/qr-punch.tsx` → scanner screen (keep route `/qr-punch` or rename to `/qr-scan` + update drawer/home links)
- Create: `employee-app/lib/qr-offline-queue.ts`
- Modify: `employee-app/lib/api.ts` — `scanQrPunch`, `syncQrPunches`
- Modify: `employee-app/constants/strings.ts`
- Modify: home/drawer labels « Pointer par QR »
- Keep: `PendingDeviceBlock` / `SENSITIVE_ACTION_HREFS` for `/qr-punch`

**Dependencies:** ensure barcode scanner available (`expo-camera` CameraView barcodeSettings, or `expo-barcode-scanner` if already aligned with Expo 56).

- [ ] **Step 1: API client**

```typescript
scanQrPunch: (payload: string) =>
  fetchApi('/employee/qr-punch/scan', { method: 'POST', body: JSON.stringify({ payload }) }),
syncQrPunches: (items: { clientId: string; payload: string; scannedAt: string }[]) =>
  fetchApi('/employee/qr-punch/sync', { method: 'POST', body: JSON.stringify({ items }) }),
```

- [ ] **Step 2: Offline queue**

Enqueue on network error / offline detection; sync on AppState active + NetInfo if present; map error codes to strings + offer punch-claim link when `DEVICE_NOT_TRUSTED` would only happen if guard fails mid-flight (rare) or item rejected for expiry — show claim CTA for `CHALLENGE_EXPIRED` / sync failures.

- [ ] **Step 3: Scanner UI** — TRUSTED only; on success show punch result; vibrate/haptic optional
- [ ] **Step 4: Manual** — online scan; airplane mode scan → go online → sync
- [ ] **Step 5: Commit**

```bash
git commit -m "feat(employee-app): scan kiosk QR with offline sync queue"
```

---

### Task 8: Docs + TODOS + smoke checklist

**Files:**
- Modify: `TODOS.md` — note QR inversé livré / item
- Modify: `docs/metier/planning-et-horaires.md` or pointage doc if QR described
- Update spec status line to « implémenté » when done

- [ ] **Step 1: Update backlog/docs briefly**
- [ ] **Step 2: Run end-to-end checklist from spec « Critères de succès »**
- [ ] **Step 3: Commit**

```bash
git commit -m "docs: mark inverted QR punch as implemented"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Remplacement total | 5, 6, 7 |
| Mode QR kiosk display only | 6 |
| TGQR:v3 + secret kiosk | 1, 2, 3 |
| Scan TRUSTED online | 4, 7 |
| Offline queue + TRUSTED at sync | 4, 7 |
| Poll kiosk result | 3, 6 |
| No GPS | (none added) |
| Remove employee QR | 5 |
| Punch claims as safety net | already allowed; UX hint Task 7 |

## Placeholder scan

None intentional — offline create-on-redeem called out explicitly in Task 4.

## Type consistency

- Prefix `TGQR:v3:` shared API + kiosk port
- Routes `/employee/qr-punch/scan|sync`, `/auth/kiosk/qr-challenge`
- Model `TimeGateQrChallenge` with `(kioskId, nonce)` unique
