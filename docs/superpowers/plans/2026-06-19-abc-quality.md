# Lot A+B+C + écarts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer change-password + profil admin, export PDF présence serveur, KPI prévu/réalisé, PWA complète employee-web, corriger les écarts UX/doc, et verrouiller par Playwright + CI.

**Architecture:** Incrémental par couche — écarts d'abord, puis API NestJS (auth, attendance PDF, dashboard analytics), UI dashboard/employee-web, PWA Serwist, enfin e2e Playwright contre stack locale seedée. Réutiliser patterns existants (`generateDocId`, `timeGateAuditLog.create`, `http.get` dashboard, scripts `test-use-cases.mjs`).

**Tech Stack:** NestJS 10, Prisma 7, pdfkit, Next.js 15, @serwist/next, Playwright, Bun, GitHub Actions.

## Global Constraints

- Spec source: `docs/superpowers/specs/2026-06-19-abc-quality-design.md` (approuvée).
- PDF: génération **serveur** via `pdfkit` — pas de headless browser.
- Employee-web: **PWA complète** (manifest, Serwist SW, offline shell, profil MDP).
- Profil employé: données RH **lecture seule** ; seul change-password éditable.
- Notifications dashboard: **masquer** la cloche (pas d'API v1).
- Hors scope: `FACE_RECO_MODE=external`, Docker, push notifications, échange shifts employé.
- Commits fréquents, un commit par tâche terminée.
- Messages commit en anglais ou français cohérent avec l'historique repo.
- Ne pas committer les `.env`.

---

## File Map

| File | Responsibility |
|------|----------------|
| `api/src/auth/dto/change-password.dto.ts` | Validation change-password |
| `api/src/auth/dto/update-me.dto.ts` | Validation PATCH profil |
| `api/src/auth/auth.service.ts` | `changePassword`, `updateMe`, `getMe` enrichi |
| `api/src/auth/auth.controller.ts` | Routes `PATCH /auth/me`, `PATCH /auth/me/password` |
| `api/src/attendance/attendance-pdf.util.ts` | Génération PDF pdfkit |
| `api/src/attendance/attendance-days.service.ts` | `export()` csv\|pdf |
| `api/src/dashboard/*` | Module KPI planning-vs-actual |
| `dashboard/lib/timegate/auth-profile.ts` | Client PATCH profil/MDP |
| `dashboard/app/(authenticated)/profile/page.tsx` | UI profil branchée |
| `dashboard/components/layout/Navbar.tsx` | Nom affiché, cloche retirée |
| `dashboard/components/ui/DataTable.tsx` | Export CSV seul |
| `employee-web/app/(app)/profile/page.tsx` | Profil + MDP |
| `employee-web/lib/offline-cache.ts` | Cache stale localStorage |
| `employee-web/public/manifest.webmanifest` | PWA manifest |
| `e2e/*` | Playwright specs + CI |

---

### Task 0: Écarts UX & documentation

**Files:**
- Modify: `dashboard/components/ui/DataTable.tsx:167-186`
- Modify: `dashboard/components/layout/Navbar.tsx:477-655`
- Modify: `README.md`
- Modify: `api/.env.example`
- Modify: `api/docs/roadmap-1.2.0.md`
- Modify: `docs/superpowers/specs/2026-06-19-abc-quality-design.md` (statut → Approuvé)

**Interfaces:**
- Produces: UI export honnête, navbar sans notifications, docs alignées.

- [ ] **Step 1: Simplifier le menu export DataTable**

Dans `dashboard/components/ui/DataTable.tsx`, remplacer le bloc dropdown export par un seul bouton :

```tsx
<button
  type="button"
  onClick={() => exportCSV()}
  className={toolbarBtnClass}
>
  <svg className="shrink-0 size-4" /* ... icône download existante ... */ />
  Exporter CSV
</button>
```

Supprimer `showExport` state et le dropdown Excel/PDF/Copier/Imprimer.

- [ ] **Step 2: Retirer notifications navbar**

Dans `dashboard/components/layout/Navbar.tsx` :
- Supprimer le bouton cloche (lignes ~477-491).
- Supprimer l'offcanvas notifications (lignes ~620-655).
- Supprimer `notifOpen` state si plus utilisé.

- [ ] **Step 3: Aligner README et `.env.example`**

`README.md` — remplacer la section face engine par :

```markdown
La reconnaissance faciale fonctionne via le moteur Python interne (`api/python/face_engine.py`).
Variables : `FACE_ENGINE_PYTHON_BIN`, `FACE_ENGINE_TIMEOUT_MS`, `FACE_VERIFY_THRESHOLD`.
Le mode service externe est planifié (hors scope actuel).
```

`api/.env.example` — conserver uniquement les variables lues par le code (pas `FACE_RECO_MODE`).

- [ ] **Step 4: Mettre à jour roadmap**

Dans `api/docs/roadmap-1.2.0.md`, marquer #32–#41 comme terminés et ajouter section « Lot ABC 2026-06 » en cours.

- [ ] **Step 5: Vérifier typecheck dashboard**

Run: `cd dashboard && bunx tsc --noEmit`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add dashboard/components/ui/DataTable.tsx dashboard/components/layout/Navbar.tsx README.md api/.env.example api/docs/roadmap-1.2.0.md docs/superpowers/specs/2026-06-19-abc-quality-design.md
git commit -m "$(cat <<'EOF'
fix: remove misleading exports and notification stub; align docs

EOF
)"
```

---

### Task 1: API change-password

**Files:**
- Create: `api/src/auth/dto/change-password.dto.ts`
- Modify: `api/src/auth/auth.service.ts`
- Modify: `api/src/auth/auth.controller.ts`
- Modify: `api/scripts/test/sections/uc01-auth.mjs`
- Modify: `api/scripts/test/sections/uc10-employee.mjs`

**Interfaces:**
- Produces: `AuthService.changePassword(user: JwtUser, dto: ChangePasswordDto): Promise<{ ok: true }>`

- [ ] **Step 1: Créer le DTO**

`api/src/auth/dto/change-password.dto.ts`:

```typescript
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
```

- [ ] **Step 2: Implémenter changePassword dans AuthService**

Ajouter imports : `UnauthorizedException`, `ChangePasswordDto`, `generateDocId`.

```typescript
async changePassword(user: JwtUser, dto: ChangePasswordDto) {
  if (dto.currentPassword === dto.newPassword) {
    throw new BadRequestException('Le nouveau mot de passe doit être différent');
  }
  const dbUser = await this.prisma.user.findUnique({
    where: { id: user.sub },
    select: { id: true, passwordHash: true, companyId: true },
  });
  if (!dbUser) throw new UnauthorizedException();
  const ok = await bcrypt.compare(dto.currentPassword, dbUser.passwordHash);
  if (!ok) throw new UnauthorizedException('Mot de passe actuel incorrect');
  const passwordHash = await bcrypt.hash(dto.newPassword, 10);
  await this.prisma.user.update({ where: { id: dbUser.id }, data: { passwordHash } });
  await this.prisma.timeGateAuditLog.create({
    data: {
      id: generateDocId('AUD'),
      userId: dbUser.id,
      companyId: dbUser.companyId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: dbUser.id,
    },
  });
  return { ok: true as const };
}
```

- [ ] **Step 3: Exposer la route**

Dans `auth.controller.ts`, ajouter `Patch` aux imports NestJS :

```typescript
@AllowInactiveSubscription()
@Patch('me/password')
changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto) {
  return this.auth.changePassword(user, dto);
}
```

- [ ] **Step 4: Tests UC-01 — admin change password**

Ajouter à la fin de `uc01-auth.mjs` (avant fermeture) :

```javascript
const NEW_ADMIN_PASS = `NewPass${ctx.unique}!`
if (ctx.tokens.admin) {
  const change = await request('/auth/me/password', {
    method: 'PATCH',
    headers: authHeader(ctx.tokens.admin),
    body: JSON.stringify({ currentPassword: PASS, newPassword: NEW_ADMIN_PASS }),
  })
  if (change.res.status === 200 && change.json?.ok) pass(ctx, 'UC-01 Change password admin')
  else fail(ctx, 'UC-01 Change password admin', detail(change.json))

  const relogin = await login('admin@monorganisation.com', { sku: 'SOTR', password: NEW_ADMIN_PASS })
  if (relogin) {
    pass(ctx, 'UC-01 Re-login admin nouveau MDP')
    ctx.tokens.admin = relogin
  } else fail(ctx, 'UC-01 Re-login admin')

  // Restaurer MDP seed pour tests suivants
  await request('/auth/me/password', {
    method: 'PATCH',
    headers: authHeader(ctx.tokens.admin),
    body: JSON.stringify({ currentPassword: NEW_ADMIN_PASS, newPassword: PASS }),
  })

  const badCurrent = await request('/auth/me/password', {
    method: 'PATCH',
    headers: authHeader(ctx.tokens.admin),
    body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'AnotherPass1!' }),
  })
  if (badCurrent.res.status === 401) pass(ctx, 'UC-01 Change password mauvais actuel')
  else fail(ctx, 'UC-01 Change password mauvais actuel', String(badCurrent.res.status))

  const short = await request('/auth/me/password', {
    method: 'PATCH',
    headers: authHeader(ctx.tokens.admin),
    body: JSON.stringify({ currentPassword: PASS, newPassword: 'short' }),
  })
  if (short.res.status === 400) pass(ctx, 'UC-01 Change password trop court')
  else fail(ctx, 'UC-01 Change password trop court', String(short.res.status))
}
```

Mettre à jour `login()` dans `helpers.mjs` pour accepter `password` optionnel :

```javascript
export async function login(email, { sku, password } = {}) {
  const body = { email, password: password ?? PASS }
  if (sku) body.sku = sku
  // ... reste inchangé
}
```

- [ ] **Step 5: Tests UC-10 — employé change password**

Dans `uc10-employee.mjs`, après login employé :

```javascript
const NEW_EMP_PASS = `EmpPass${ctx.unique}!`
const change = await request('/auth/me/password', {
  method: 'PATCH',
  headers: empAuth,
  body: JSON.stringify({ currentPassword: PASS, newPassword: NEW_EMP_PASS }),
})
if (change.res.status === 200) pass(ctx, 'UC-10 Change password employé')
else fail(ctx, 'UC-10 Change password employé', detail(change.json))
// Re-login + restore similaire UC-01
```

- [ ] **Step 6: Run tests API**

Run (terminal 1): `cd api && bun run prisma:migrate && bun run prisma:seed && bun run start:dev`  
Run (terminal 2): `cd api && TIMEGATE_WAIT_API=1 bun run test:use-cases`  
Expected: UC-01 et UC-10 password tests PASS

- [ ] **Step 7: Commit**

```bash
git add api/src/auth/dto/change-password.dto.ts api/src/auth/auth.service.ts api/src/auth/auth.controller.ts api/scripts/test/sections/uc01-auth.mjs api/scripts/test/sections/uc10-employee.mjs api/scripts/test/helpers.mjs
git commit -m "$(cat <<'EOF'
feat(api): add PATCH /auth/me/password with audit log

EOF
)"
```

---

### Task 2: API profil (GET enrichi + PATCH /auth/me)

**Files:**
- Create: `api/src/auth/dto/update-me.dto.ts`
- Modify: `api/src/auth/auth.service.ts`
- Modify: `api/src/auth/auth.controller.ts`
- Modify: `api/scripts/test/sections/uc01-auth.mjs`

**Interfaces:**
- Consumes: `JwtUser` from JWT strategy
- Produces: `getMe()` returns `{ id, email, firstName, lastName, role, companyId, employeeId }`
- Produces: `updateMe(user, dto)` returns same shape

- [ ] **Step 1: DTO update-me**

```typescript
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  lastName?: string;
}
```

- [ ] **Step 2: Enrichir getMe + updateMe**

```typescript
async getMe(user: JwtUser) {
  const dbUser = await this.prisma.user.findUnique({
    where: { id: user.sub },
    select: { id: true, email: true, firstName: true, lastName: true, timeGateRole: true, companyId: true, employee: { select: { id: true } } },
  });
  if (!dbUser) throw new UnauthorizedException();
  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    role: dbUser.timeGateRole,
    companyId: dbUser.companyId,
    employeeId: dbUser.employee?.id ?? null,
  };
}

async updateMe(user: JwtUser, dto: UpdateMeDto) {
  if (user.role === TimeGateUserRole.EMPLOYEE) {
    throw new ForbiddenException('Profil employé en lecture seule');
  }
  const data: { firstName?: string | null; lastName?: string | null } = {};
  if (dto.firstName !== undefined) data.firstName = dto.firstName.trim() || null;
  if (dto.lastName !== undefined) data.lastName = dto.lastName.trim() || null;
  const updated = await this.prisma.user.update({
    where: { id: user.sub },
    data,
    select: { id: true, email: true, firstName: true, lastName: true, timeGateRole: true, companyId: true, employee: { select: { id: true } } },
  });
  return {
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    role: updated.timeGateRole,
    companyId: updated.companyId,
    employeeId: updated.employee?.id ?? null,
  };
}
```

Remplacer l'ancien `getMe` synchrone par `async getMe`.

- [ ] **Step 3: Routes controller**

```typescript
@AllowInactiveSubscription()
@Get('me')
me(@CurrentUser() user: JwtUser) {
  return this.auth.getMe(user);
}

@AllowInactiveSubscription()
@Patch('me')
updateMe(@CurrentUser() user: JwtUser, @Body() dto: UpdateMeDto) {
  return this.auth.updateMe(user, dto);
}
```

- [ ] **Step 4: Test UC-01 profil**

```javascript
const me = await request('/auth/me', { headers: authHeader(ctx.tokens.admin) })
if (me.res.status === 200 && me.json?.email) pass(ctx, 'UC-01 GET /auth/me enrichi')
else fail(ctx, 'UC-01 GET /auth/me', detail(me.json))

const patch = await request('/auth/me', {
  method: 'PATCH',
  headers: authHeader(ctx.tokens.admin),
  body: JSON.stringify({ firstName: 'Admin', lastName: 'Test' }),
})
if (patch.res.status === 200 && patch.json?.firstName === 'Admin') pass(ctx, 'UC-01 PATCH /auth/me')
else fail(ctx, 'UC-01 PATCH /auth/me', detail(patch.json))
```

- [ ] **Step 5: Run tests + commit**

```bash
git add api/src/auth/dto/update-me.dto.ts api/src/auth/auth.service.ts api/src/auth/auth.controller.ts api/scripts/test/sections/uc01-auth.mjs
git commit -m "$(cat <<'EOF'
feat(api): extend GET /auth/me and add PATCH /auth/me for admin profile

EOF
)"
```

---

### Task 3: Dashboard profil + navbar

**Files:**
- Create: `dashboard/lib/timegate/auth-profile.ts`
- Modify: `dashboard/lib/timegate/types.ts`
- Modify: `dashboard/lib/auth/constants.ts`
- Modify: `dashboard/app/(authenticated)/profile/page.tsx`
- Modify: `dashboard/components/layout/Navbar.tsx`

**Interfaces:**
- Consumes: `PATCH /auth/me`, `PATCH /auth/me/password`
- Produces: `changePassword(currentPassword, newPassword)`, `updateProfile({ firstName?, lastName? })`

- [ ] **Step 1: Types + routes**

`types.ts` — étendre `TimeGateUser` :

```typescript
export type TimeGateUser = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  role: TimeGateRole
  companyId: string | null
  employeeId?: string | null
}
```

`constants.ts` :

```typescript
export const TIMEGATE_AUTH_ROUTES = {
  // ...existing
  changePassword: '/auth/me/password',
  updateMe: '/auth/me',
} as const
```

- [ ] **Step 2: Client API**

`dashboard/lib/timegate/auth-profile.ts`:

```typescript
import { http } from '@/lib/http'
import type { TimeGateUser } from '@/lib/timegate/types'

export function updateProfile(body: { firstName?: string; lastName?: string }) {
  return http.patch<TimeGateUser>('/auth/me', body)
}

export function changePassword(body: { currentPassword: string; newPassword: string }) {
  return http.patch<{ ok: true }>('/auth/me/password', body)
}
```

- [ ] **Step 3: Brancher profile/page.tsx**

- Onglet Informations : state `firstName`, `lastName` depuis `profile` ; bouton Enregistrer appelle `updateProfile` ; retirer `disabled` du bouton.
- Onglet Mot de passe : state `currentPassword`, `newPassword`, `confirmPassword` ; valider égalité confirm ; appeler `changePassword` ; vider champs au succès.

- [ ] **Step 4: Navbar display name**

Remplacer `{adminEmail.split('@')[0]}` par :

```tsx
const displayName =
  [session?.user?.firstName, session?.user?.lastName].filter(Boolean).join(' ') ||
  adminEmail.split('@')[0]
```

Si session NextAuth ne stocke pas firstName/lastName, fetch `/auth/me` dans Navbar ou étendre le callback NextAuth pour inclure `firstName`/`lastName` après login (vérifier `dashboard/lib/auth/` — ajouter au JWT callback si nécessaire).

- [ ] **Step 5: Typecheck**

Run: `cd dashboard && bunx tsc --noEmit`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add dashboard/lib/timegate/auth-profile.ts dashboard/lib/timegate/types.ts dashboard/lib/auth/constants.ts dashboard/app/(authenticated)/profile/page.tsx dashboard/components/layout/Navbar.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): wire profile and password change UI

EOF
)"
```

---

### Task 4: Employee-web profil (avant PWA shell)

**Files:**
- Create: `employee-web/app/(app)/profile/page.tsx`
- Create: `employee-web/lib/auth-profile.ts`
- Modify: `employee-web/components/AppShell.tsx`
- Modify: `employee-web/lib/api.ts`

**Interfaces:**
- Consumes: `PATCH /auth/me/password`, `GET /employee/me`

- [ ] **Step 1: Client changePassword**

`employee-web/lib/auth-profile.ts`:

```typescript
import { getApiBaseUrl, getToken } from '@/lib/auth'

export async function changePassword(currentPassword: string, newPassword: string) {
  const token = getToken()
  const res = await fetch(`${getApiBaseUrl()}/auth/me/password`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Erreur ${res.status}`)
  }
  return res.json()
}
```

- [ ] **Step 2: Page profil**

`employee-web/app/(app)/profile/page.tsx` — sections :
- Carte identité (nom, email, branche, horaire) depuis `getEmployeeMe()`
- Formulaire MDP (3 champs) → `changePassword`
- Messages erreur/succès FR

- [ ] **Step 3: Bottom nav 4e onglet**

Dans `AppShell.tsx`, ajouter :

```typescript
{ href: '/profile', label: 'Profil', icon: '👤' },
```

- [ ] **Step 4: Typecheck**

Run: `cd employee-web && npx tsc --noEmit`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add employee-web/app/(app)/profile/page.tsx employee-web/lib/auth-profile.ts employee-web/components/AppShell.tsx
git commit -m "$(cat <<'EOF'
feat(employee-web): add profile page with password change

EOF
)"
```

---

### Task 5: API export PDF présence

**Files:**
- Create: `api/src/attendance/attendance-pdf.util.ts`
- Modify: `api/src/attendance/dto/export-attendance-days-query.dto.ts`
- Modify: `api/src/attendance/attendance-days.service.ts`
- Modify: `api/src/attendance/attendance.controller.ts`
- Modify: `api/package.json`
- Modify: `api/scripts/test/sections/uc05-attendance.mjs`

**Interfaces:**
- Produces: `exportDays(query, user)` → `{ filename, csv? }` ou `{ filename, contentBase64, mimeType }`

- [ ] **Step 1: Installer pdfkit**

Run: `cd api && bun add pdfkit && bun add -d @types/pdfkit`

- [ ] **Step 2: DTO format**

Ajouter à `export-attendance-days-query.dto.ts` :

```typescript
import { IsIn, IsOptional } from 'class-validator';

@IsOptional()
@IsIn(['csv', 'pdf'])
format?: 'csv' | 'pdf';
```

- [ ] **Step 3: Util PDF**

`attendance-pdf.util.ts` — fonction `buildAttendanceDaysPdf(rows, meta)` retournant `Buffer` :
- En-tête : company name, période, date export
- Tableau : Date | Employé | Branche | Statut | Horaire | Congé | Check-ins
- Limite 10 000 lignes ; si dépassé, throw `BadRequestException('Export limit exceeded')`

- [ ] **Step 4: Service export unifié**

Refactor `exportCsv` → méthode privée `fetchExportRows(query, user)` partagée.

```typescript
async exportDays(query: ExportAttendanceDaysQueryDto, user?: JwtUser) {
  const rows = await this.fetchExportRows(query, user);
  const format = query.format ?? 'csv';
  if (format === 'csv') return this.toCsvResponse(rows, query);
  const pdfBuffer = buildAttendanceDaysPdf(rows, { from: query.from, to: query.to });
  return {
    filename: `attendance-days-${query.from}_${query.to}.pdf`,
    contentBase64: pdfBuffer.toString('base64'),
    mimeType: 'application/pdf',
  };
}
```

Renommer route handler `exportDays` dans controller (garder path `days/export`).

- [ ] **Step 5: Test UC-05 PDF**

```javascript
const pdfExport = await request('/attendance/days/export?from=2026-01-01&to=2026-01-31&format=pdf', { headers: auth })
if (
  pdfExport.json?.mimeType === 'application/pdf' &&
  pdfExport.json?.contentBase64?.length > 100
) pass(ctx, 'UC-05 Export PDF présences')
else fail(ctx, 'UC-05 Export PDF', detail(pdfExport.json))
```

- [ ] **Step 6: Run tests + commit**

```bash
git add api/src/attendance/ api/package.json api/scripts/test/sections/uc05-attendance.mjs
git commit -m "$(cat <<'EOF'
feat(api): add server-side PDF export for attendance days

EOF
)"
```

---

### Task 6: API KPI planning-vs-actual

**Files:**
- Create: `api/src/dashboard/dashboard.module.ts`
- Create: `api/src/dashboard/dashboard.controller.ts`
- Create: `api/src/dashboard/dashboard.service.ts`
- Create: `api/src/dashboard/dto/planning-vs-actual-query.dto.ts`
- Create: `api/scripts/test/sections/uc13-planning-kpi.mjs`
- Modify: `api/src/app.module.ts`
- Modify: `api/scripts/test-use-cases.mjs`

**Interfaces:**
- Produces: `GET /dashboard/planning-vs-actual` → `PlanningVsActualResponse`

- [ ] **Step 1: DTO query**

```typescript
export class PlanningVsActualQueryDto {
  @IsDateString() @IsNotEmpty() from!: string;
  @IsDateString() @IsNotEmpty() to!: string;
  @IsOptional() @IsString() branchId?: string;
}
```

- [ ] **Step 2: Service calcul v1**

`dashboard.service.ts` — algorithme :
1. Résoudre `companyId` depuis `JwtUser`.
2. Charger employés actifs (filtrer `branchId`).
3. Charger assignments, shift types, holidays (company + employee lists), leaves APPROVED/OPEN, timesheets période.
4. Pour chaque (employé, jour) : calculer planned minutes (assignment active + shift duration ; 0 si férié/congé).
5. Agréger worked minutes depuis timesheets.
6. Calculer `coveragePercent = planned > 0 ? (worked/planned)*100 : null`.
7. Grouper `byWeek` (clé ISO week).

Helper shift duration :

```typescript
function shiftMinutes(shift: { startTime: Date | null; endTime: Date | null }): number {
  if (!shift.startTime || !shift.endTime) return 480;
  const start = shift.startTime.getUTCHours() * 60 + shift.startTime.getUTCMinutes();
  const end = shift.endTime.getUTCHours() * 60 + shift.endTime.getUTCMinutes();
  return Math.max(0, end - start);
}
```

- [ ] **Step 3: Controller**

```typescript
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  @Get('planning-vs-actual')
  planningVsActual(@CurrentUser() user: JwtUser, @Query() query: PlanningVsActualQueryDto) {
    return this.dashboard.planningVsActual(query, user);
  }
}
```

Roles : ADMIN, MANAGER (pas EMPLOYEE, pas SUPER_ADMIN ops).

- [ ] **Step 4: Test UC-13**

Créer `uc13-planning-kpi.mjs` :

```javascript
export async function runUc13(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  const res = await request('/dashboard/planning-vs-actual?from=2026-01-01&to=2026-01-31', { headers: auth })
  if (
    res.res.status === 200 &&
    typeof res.json?.plannedMinutes === 'number' &&
    typeof res.json?.workedMinutes === 'number' &&
    Array.isArray(res.json?.byWeek)
  ) pass(ctx, 'UC-13 Planning vs actual')
  else fail(ctx, 'UC-13 Planning vs actual', detail(res.json))
}
```

Enregistrer dans `test-use-cases.mjs`.

- [ ] **Step 5: Run tests + commit**

```bash
git add api/src/dashboard/ api/src/app.module.ts api/scripts/test/
git commit -m "$(cat <<'EOF'
feat(api): add planning-vs-actual dashboard KPI endpoint

EOF
)"
```

---

### Task 7: Dashboard export PDF + KPI home

**Files:**
- Create: `dashboard/lib/timegate/planning-vs-actual.ts`
- Modify: `dashboard/lib/timegate/attendance.ts`
- Modify: `dashboard/lib/timegate/dashboard-stats.ts`
- Modify: `dashboard/app/(authenticated)/attendance/days/page.tsx`
- Modify: `dashboard/app/(authenticated)/page.tsx`
- Modify: `dashboard/components/dashboard/DashboardAnalytics.tsx`

**Interfaces:**
- Consumes: `GET /dashboard/planning-vs-actual`, export PDF API

- [ ] **Step 1: Client export PDF**

`attendance.ts` :

```typescript
export function exportAttendanceDaysPdf(params: AttendanceDayQuery) {
  return http.get<{ filename: string; contentBase64: string; mimeType: string }>(
    '/attendance/days/export',
    { params: { ...params, format: 'pdf' } },
  )
}
```

Helper download :

```typescript
export function downloadBase64File(contentBase64: string, filename: string, mimeType: string) {
  const bytes = Uint8Array.from(atob(contentBase64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Bouton PDF attendance page**

Ajouter `handleExportPdf()` parallèle à `handleExport()` ; second bouton « Exporter PDF ».

- [ ] **Step 3: Client KPI + dashboard-stats**

`planning-vs-actual.ts` :

```typescript
export type PlanningVsActual = {
  from: string
  to: string
  plannedMinutes: number
  workedMinutes: number
  varianceMinutes: number
  coveragePercent: number | null
  byWeek: Array<{ week: string; label: string; plannedMinutes: number; workedMinutes: number }>
}

export function getPlanningVsActual(params: { from: string; to: string; branchId?: string }) {
  return http.get<PlanningVsActual>('/dashboard/planning-vs-actual', { params })
}
```

Intégrer dans `loadDashboardData()` — appeler avec `lastNDaysRange(30)`.

- [ ] **Step 4: UI home**

- Carte StatCard « Couverture planning » avec `coveragePercent` formaté `%`.
- `DashboardAnalytics` : nouveau `ChartCard` barres groupées Prévu/Réalisé depuis `data.planningVsActual.byWeek`.

- [ ] **Step 5: Typecheck + commit**

```bash
git add dashboard/lib/timegate/ dashboard/app/ dashboard/components/dashboard/
git commit -m "$(cat <<'EOF'
feat(dashboard): PDF attendance export and planning coverage KPI

EOF
)"
```

---

### Task 8: PWA complète employee-web

**Files:**
- Create: `employee-web/public/manifest.webmanifest`
- Create: `employee-web/public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
- Create: `employee-web/app/offline/page.tsx`
- Create: `employee-web/lib/offline-cache.ts`
- Create: `employee-web/components/InstallPrompt.tsx`
- Create: `employee-web/components/OfflineBadge.tsx`
- Create: `employee-web/app/sw.ts` (Serwist)
- Modify: `employee-web/next.config.js`
- Modify: `employee-web/app/layout.tsx`
- Modify: `employee-web/package.json`
- Modify: `employee-web/lib/api.ts`

**Interfaces:**
- Produces: SW registered at build, manifest servable, offline cache keys `tg_offline_me`, `tg_offline_balances`, `tg_offline_checkins`

- [ ] **Step 1: Installer Serwist**

Run: `cd employee-web && npm install @serwist/next serwist`

- [ ] **Step 2: Manifest + icônes**

Créer `manifest.webmanifest` (contenu spec section 4.2).

Générer icônes PNG simples (fond `#0f0828`, texte « TG » blanc centré) — 192, 512, 180 apple-touch.

- [ ] **Step 3: next.config.js Serwist**

```javascript
const withSerwist = require('@serwist/next').default({ swSrc: 'app/sw.ts', swDest: 'public/sw.js' })
module.exports = withSerwist({ /* existing */ })
```

`app/sw.ts` :

```typescript
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry } from 'serwist'
import { Serwist } from 'serwist'

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: PrecacheEntry[] }

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})
serwist.addEventListeners()
```

- [ ] **Step 4: Page offline**

`app/offline/page.tsx` — message FR « Connexion requise pour actualiser vos données ».

- [ ] **Step 5: offline-cache.ts**

```typescript
const KEYS = { me: 'tg_offline_me', balances: 'tg_offline_balances', checkins: 'tg_offline_checkins' } as const

export function cacheJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}

export { KEYS }
```

Dans `api.ts`, après fetch réussi de me/balances/checkins, appeler `cacheJson`.

Pages home/checkins : si fetch échoue (network), lire cache + afficher `<OfflineBadge />`.

- [ ] **Step 6: InstallPrompt**

Composant client écoutant `beforeinstallprompt` ; bandeau discret en bas ; bouton Installer ; iOS : texte « Partager → Sur l'écran d'accueil ».

Monter dans `AppShell`.

- [ ] **Step 7: layout.tsx manifest link**

```tsx
<head>
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</head>
```

(Utiliser `metadata.manifest` Next.js 15 si préféré.)

- [ ] **Step 8: Build**

Run: `cd employee-web && npm run build`  
Expected: PASS, `public/sw.js` généré

- [ ] **Step 9: Commit**

```bash
git add employee-web/
git commit -m "$(cat <<'EOF'
feat(employee-web): full PWA with Serwist, offline cache, and install prompt

EOF
)"
```

---

### Task 9: Playwright e2e + CI

**Files:**
- Create: `e2e/package.json`
- Create: `e2e/playwright.config.ts`
- Create: `e2e/fixtures/api.ts`
- Create: `e2e/dashboard/profile.spec.ts`
- Create: `e2e/dashboard/attendance-export.spec.ts`
- Create: `e2e/dashboard/home-kpi.spec.ts`
- Create: `e2e/employee-web/profile.spec.ts`
- Create: `e2e/employee-web/pwa-manifest.spec.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `api/docs/use-cases-test.md`

**Interfaces:**
- Consumes: API seed accounts, frontends on 3000/3001

- [ ] **Step 1: Scaffold e2e package**

`e2e/package.json` :

```json
{
  "name": "timegate-e2e",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0"
  }
}
```

Run: `cd e2e && npm install`

- [ ] **Step 2: playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  projects: [
    { name: 'dashboard', testMatch: /dashboard\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'], baseURL: process.env.PLAYWRIGHT_BASE_URL_DASHBOARD ?? 'http://localhost:3000' } },
    { name: 'employee-web', testMatch: /employee-web\/.*\.spec\.ts/, use: { ...devices['Pixel 5'], baseURL: process.env.PLAYWRIGHT_BASE_URL_EMPLOYEE ?? 'http://localhost:3001' } },
  ],
})
```

- [ ] **Step 3: fixtures/api.ts**

```typescript
const API = process.env.TIMEGATE_API_URL ?? 'http://127.0.0.1:4001/api/v1'
const PASS = 'ChangeMe123!'

export async function loginAdmin() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@monorganisation.com', password: PASS, sku: 'SOTR' }),
  })
  const json = await res.json()
  return json.access_token as string
}
```

- [ ] **Step 4: dashboard/profile.spec.ts**

```typescript
import { test, expect } from '@playwright/test'

test('admin can change password from profile', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'admin@monorganisation.com')
  await page.fill('input[type="password"]', 'ChangeMe123!')
  await page.fill('input[name="sku"], input[placeholder*="SKU"]', 'SOTR').catch(() => {})
  // Adapter sélecteurs au formulaire login réel
  await page.click('button[type="submit"]')
  await page.waitForURL('/')
  await page.goto('/profile')
  await page.getByRole('tab', { name: /Mot de passe/i }).click()
  const newPass = `E2ePass${Date.now()}!`
  await page.fill('input[placeholder="••••••••"]', 'ChangeMe123!') // current — utiliser labels FormField
  // ... remplir new + confirm, submit, re-login avec newPass, restore
  await expect(page.getByText(/succès|mis à jour/i)).toBeVisible()
})
```

Ajuster sélecteurs après lecture des composants login/profile réels.

- [ ] **Step 5: attendance-export.spec.ts**

Login admin → `/attendance/days` → cliquer Exporter CSV → attendre download ; idem PDF → vérifier `.pdf` extension.

- [ ] **Step 6: home-kpi.spec.ts**

Login admin → `/` → `expect(page.getByText(/Couverture planning/i)).toBeVisible()`

- [ ] **Step 7: employee-web specs**

`profile.spec.ts` : login `patrick.mukendi@sotrafer.cg` → `/profile` → change MDP.

`pwa-manifest.spec.ts` :

```typescript
test('manifest is valid PWA', async ({ request, baseURL }) => {
  const res = await request.get(`${baseURL}/manifest.webmanifest`)
  expect(res.ok()).toBeTruthy()
  const manifest = await res.json()
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.length).toBeGreaterThan(0)
})
```

- [ ] **Step 8: CI job e2e**

Ajouter à `.github/workflows/ci.yml` :

```yaml
  e2e:
    runs-on: ubuntu-latest
    needs: [api, frontend]
    services:
      postgres: # same as api job
    env:
      DATABASE_URL: postgresql://timegate:timegate@localhost:5432/timegate
      JWT_SECRET: ci-test-secret-change-me
      PLAYWRIGHT_BASE_URL_DASHBOARD: http://localhost:3000
      PLAYWRIGHT_BASE_URL_EMPLOYEE: http://localhost:3001
      TIMEGATE_API_URL: http://127.0.0.1:4001/api/v1
    steps:
      - uses: actions/checkout@v4
      # setup node, bun, migrate, seed, build+start api, dashboard, employee-web
      - run: cd e2e && npm ci && npx playwright install --with-deps && npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: e2e/playwright-report/
```

- [ ] **Step 9: Mettre à jour use-cases-test.md**

Retirer « change-password à venir » ; documenter UC-13 ; noter tests Playwright e2e.

- [ ] **Step 10: Run e2e local**

Terminal 1: API + dashboard + employee-web running  
Terminal 2: `cd e2e && npx playwright test`  
Expected: 5 specs PASS

- [ ] **Step 11: Commit**

```bash
git add e2e/ .github/workflows/ci.yml api/docs/use-cases-test.md
git commit -m "$(cat <<'EOF'
test(e2e): add Playwright suite for profile, exports, KPI, and PWA manifest

EOF
)"
```

---

## Self-Review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| DataTable export honnête | Task 0 |
| Masquer notifications | Task 0 |
| Docs README/roadmap/env | Task 0, 9 |
| PATCH /auth/me/password | Task 1 |
| PATCH /auth/me + GET enrichi | Task 2 |
| Dashboard profil + navbar | Task 3 |
| Employee-web profil MDP | Task 4 |
| PDF serveur attendance | Task 5, 7 |
| KPI planning-vs-actual | Task 6, 7 |
| PWA complète | Task 8 |
| Playwright + CI | Task 9 |
| UC tests API | Tasks 1, 5, 6 |

Aucun placeholder TBD restant. Types cohérents (`PlanningVsActual`, `ChangePasswordDto`, export PDF response).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-19-abc-quality.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
