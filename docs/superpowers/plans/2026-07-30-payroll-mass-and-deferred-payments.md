# Payroll Mass & Deferred Payments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose denormalized payroll mass totals everywhere ADMIN needs them, and support deferred per-line payments via pay groups, with inbox+email alerts and nine Copilot payroll tools.

**Architecture:** Extend `TimeGatePayrollRun` with aggregate money columns recalculated in `generateLines()`. Add `PayGroup` + employee assignment/override; stamp `dueDate` / `paymentStatus` / `paidAt` on each `TimeGatePayrollLine`. Replace whole-run `markPaid` with `mark-lines-paid` and derive `PARTIALLY_PAID` / `PAID`. Surface totals in dashboard list/detail/home; cron emits `PAYROLL_DUE_SOON` / `PAYROLL_OVERDUE`; register ADMIN-only AI tools in `AiToolRegistry`.

**Tech Stack:** NestJS, Prisma, Next.js dashboard, TypeScript, existing notification + mail + Copilot stacks.

**Spec:** `docs/superpowers/specs/2026-07-30-payroll-mass-and-deferred-payments-design.md`

## Global Constraints

- ADMIN-only for all payroll mass, pay groups, line payments, and payroll AI tools (never MANAGER).
- Money: `Decimal(21,9)` + `fromDecimal` / `toDecimal` / `roundMoney` in `api/src/common/utils/money.util.ts`.
- IDs: `generateDocId(prefix)` in `api/src/common/utils/doc-id.util.ts`.
- `payDayOfMonth` stored 1–28; when applying to a calendar month, clamp to last day of that month if needed.
- Alert defaults: J-3, J-1 (due soon), J+1 (overdue); dedupe per company/type/line/day.
- Marking paid on `DRAFT` runs is forbidden (`400`).
- Prefer manual migration folder + `prisma migrate deploy` (AlwaysData has no reliable shadow DB).

---

## File Structure

### API — create
- `api/src/pay-groups/pay-groups.module.ts`
- `api/src/pay-groups/pay-groups.service.ts`
- `api/src/pay-groups/pay-groups.controller.ts`
- `api/src/pay-groups/dto/create-pay-group.dto.ts`
- `api/src/pay-groups/dto/update-pay-group.dto.ts`
- `api/src/pay-groups/dto/find-pay-groups-query.dto.ts`
- `api/src/payroll-runs/dto/mark-lines-paid.dto.ts`
- `api/src/payroll-runs/dto/find-payroll-lines-query.dto.ts`
- `api/src/payroll-runs/payroll-due-date.util.ts`
- `api/src/payroll-runs/payroll-run-totals.util.ts`
- `api/prisma/migrations/YYYYMMDDHHMMSS_payroll_mass_and_deferred_payments/migration.sql`

### API — modify
- `api/prisma/schema.prisma` — enums, `PayGroup`, Employee/Line/Run fields, Company relation, NotificationType
- `api/src/payroll-runs/payroll-runs.service.ts` — totals, dueDate, mark-lines-paid, filters, branch summary
- `api/src/payroll-runs/payroll-runs.controller.ts` — new routes
- `api/src/employees/employees.service.ts` + DTOs — `payGroupId`, `payDueDayOverride`
- `api/src/dashboard/dashboard.service.ts` — ADMIN `payrollMass` KPI + 6-month series
- `api/src/notifications/notifications.service.ts` — emit due soon / overdue
- `api/src/ai/ai-tool.registry.ts` + `ai-copilot.service.ts` — 9 tools
- `api/src/app.module.ts` — register `PayGroupsModule`
- Cron/schedule provider used by notifications (extend existing scheduled jobs pattern)

### Dashboard — create
- `dashboard/app/(authenticated)/pay-groups/page.tsx`
- `dashboard/app/(authenticated)/pay-groups/new/page.tsx`
- `dashboard/app/(authenticated)/pay-groups/[id]/edit/page.tsx`
- `dashboard/components/timegate/PayGroupForm.tsx`
- `dashboard/lib/timegate/pay-groups.ts`
- `dashboard/components/timegate/PayrollRunMassBanner.tsx`
- `dashboard/components/timegate/PayrollLinesPaymentTable.tsx`
- `dashboard/components/timegate/PayrollBranchPaymentSummary.tsx`

### Dashboard — modify
- `dashboard/lib/navigation.ts` — Groupes de paie
- `dashboard/lib/auth/route-guard.ts` — ADMIN route
- `dashboard/lib/timegate/types.ts` — totals, payment fields, PayGroup
- `dashboard/lib/timegate/payroll-runs.ts` — new API helpers
- `dashboard/app/(authenticated)/payroll-runs/page.tsx` — mass columns
- `dashboard/app/(authenticated)/payroll-runs/[id]/page.tsx` — banner + payment UX
- `dashboard/components/timegate/EmployeeForm.tsx` — pay group fields
- `dashboard/app/(authenticated)/page.tsx` — ADMIN payroll KPI card
- Copilot suggestions chips (where existing suggestions are defined)

---

### Task 1: Prisma schema — PayGroup, totals, line payment fields

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/prisma/migrations/<timestamp>_payroll_mass_and_deferred_payments/migration.sql`

**Interfaces:**
- Produces: `PayGroup` model; `PayrollLinePaymentStatus` enum; `TimeGatePayrollRunStatus.PARTIALLY_PAID`; run total columns; line `dueDate`/`paidAt`/`paymentStatus`; Employee `payGroupId`/`payDueDayOverride`; notification types `PAYROLL_DUE_SOON`, `PAYROLL_OVERDUE`.

- [ ] **Step 1: Extend enums in schema**

```prisma
enum TimeGatePayrollRunStatus {
  DRAFT
  LOCKED
  PARTIALLY_PAID
  PAID
}

enum PayrollLinePaymentStatus {
  UNPAID
  PAID
}
```

Add to `TimeGateNotificationType`:
```prisma
  PAYROLL_DUE_SOON
  PAYROLL_OVERDUE
```

- [ ] **Step 2: Add `PayGroup` model and wire Company/Employee**

```prisma
model PayGroup {
  id        String   @id @db.VarChar(140)
  createdAt DateTime @default(now()) @map("creation")
  updatedAt DateTime @updatedAt @map("modified")

  companyId     String @map("company") @db.VarChar(140)
  company       Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  name          String @db.VarChar(140)
  payDayOfMonth Int    @map("pay_day_of_month")

  employees Employee[]

  @@index([companyId])
  @@map("timegate_pay_group")
}
```

On `Employee` add:
```prisma
  payGroupId         String?   @map("pay_group") @db.VarChar(140)
  payGroup           PayGroup? @relation(fields: [payGroupId], references: [id], onDelete: SetNull)
  payDueDayOverride  Int?      @map("pay_due_day_override")
```

On `Company` add `payGroups PayGroup[]`.

- [ ] **Step 3: Extend payroll run + line**

On `TimeGatePayrollRun` add Decimal totals + counts (see spec). On `TimeGatePayrollLine` add `dueDate`, `paidAt`, `paymentStatus` with indexes.

- [ ] **Step 4: Write SQL migration manually** (CREATE TYPE/ALTER as needed for Postgres enums + tables/columns/indexes).

- [ ] **Step 5: Generate client & deploy**

```bash
cd api && bunx prisma generate && bunx prisma migrate deploy
```

Expected: migration applied, client includes new models.

- [ ] **Step 6: Commit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations/
git commit -m "feat(api): add pay groups and payroll mass/payment schema"
```

---

### Task 2: Due-date + totals utilities (pure functions)

**Files:**
- Create: `api/src/payroll-runs/payroll-due-date.util.ts`
- Create: `api/src/payroll-runs/payroll-run-totals.util.ts`
- Create: `api/src/payroll-runs/payroll-due-date.util.spec.ts` (or project’s existing unit runner if any; otherwise a small `node --test` / bun test file colocated — follow repo convention; if no unit runner, add assertions in `api/scripts/test` helper smoke later and keep utils pure)

**Interfaces:**
- Produces:
  - `resolvePayDueDate(year: number, month: number, payDayOfMonth: number): Date` — UTC date-only
  - `resolveEmployeePayDay(groupDay: number | null | undefined, override: number | null | undefined): number | null`
  - `sumPayrollLineTotals(lines: Array<{...money fields, paymentStatus}>): { totalGross, totalNet, ..., paidCount, unpaidCount }`

- [ ] **Step 1: Implement `resolvePayDueDate`**

Clamp day to last day of `year-month` (UTC). Example: Feb + day 28 → Feb 28; June + 28 → June 28.

- [ ] **Step 2: Implement `sumPayrollLineTotals`**

Sum each money field with `roundMoney`; count PAID vs UNPAID.

- [ ] **Step 3: Commit**

```bash
git add api/src/payroll-runs/payroll-due-date.util.ts api/src/payroll-runs/payroll-run-totals.util.ts
git commit -m "feat(api): add payroll due-date and totals helpers"
```

---

### Task 3: Pay groups CRUD API

**Files:**
- Create: `api/src/pay-groups/*` (module, service, controller, DTOs)
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Produces: `GET/POST /pay-groups`, `GET/PATCH/DELETE /pay-groups/:id` — ADMIN, company-scoped.
- DTO create: `{ name: string, payDayOfMonth: number }` with `@Min(1) @Max(28)`.

- [ ] **Step 1: Scaffold module** mirroring `compensation-grid` patterns (`generateDocId('PGRP')` or similar).

- [ ] **Step 2: Implement service create/list/update/delete** with `companyId` from `JwtUser`.

- [ ] **Step 3: Register in `AppModule`**.

- [ ] **Step 4: Smoke with curl** (login ADMIN + POST/GET).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(api): add pay-groups CRUD"
```

---

### Task 4: Employee pay group fields + generateLines dueDate & totals

**Files:**
- Modify: employee update DTO + `employees.service.ts`
- Modify: `api/src/payroll-runs/payroll-runs.service.ts` (`generateLines`, `toRunShape`, `toLineShape`, `lock`)

**Interfaces:**
- Consumes: `resolvePayDueDate`, `sumPayrollLineTotals`, `PayGroup`
- Produces: each new/regenerated line has `dueDate` + `paymentStatus: UNPAID`; run row updated with totals after lines insert.

- [ ] **Step 1: Allow PATCH employee `payGroupId`, `payDueDayOverride`** (validate group belongs to same company; override 1–28 or null).

- [ ] **Step 2: In `generateLines`, load employee `payGroup` + override; set `dueDate` when a pay day resolves; else `dueDate: null`.

- [ ] **Step 3: After creating lines, call totals helper and `prisma.timeGatePayrollRun.update` with aggregate columns + `paidCount`/`unpaidCount`.**

- [ ] **Step 4: Extend `toRunShape` / `toLineShape` to return `totals`, `paymentProgress`, payment fields.**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(api): stamp due dates and denormalized payroll run totals"
```

---

### Task 5: mark-lines-paid, filters, branch summary, run status derivation

**Files:**
- Create: `api/src/payroll-runs/dto/mark-lines-paid.dto.ts`
- Create: `api/src/payroll-runs/dto/find-payroll-lines-query.dto.ts`
- Modify: `payroll-runs.service.ts`, `payroll-runs.controller.ts`

**Interfaces:**
- Produces:
  - `POST /payroll-runs/:id/mark-lines-paid` body `{ lineIds: string[], paidAt?: string }`
  - `GET .../lines` query filters
  - `GET /payroll-runs/:id/payment-summary-by-branch`
  - Replaces semantics of `PATCH .../mark-paid` → marks **all unpaid lines** then sets run `PAID` (or remove endpoint and only use mark-lines-paid; prefer: keep route as “pay all unpaid” wrapper calling same service method).

- [ ] **Step 1: Implement `markLinesPaid(runId, user, lineIds, paidAt?)`**

Reject if status `DRAFT`. Update matching unpaid lines. Recompute counts + set status:
- all paid → `PAID` + `paidAt` on run
- some paid → `PARTIALLY_PAID`
- none → stay `LOCKED`

- [ ] **Step 2: `findLines` filters** `branchId`, `payGroupId` (via employee), `paymentStatus`, `dueFrom`, `dueTo`.

- [ ] **Step 3: `paymentSummaryByBranch`** — group by `employee.branchId`, return `{ branchId, branchName, total, paid, unpaid, unpaidEmployeeIds[] }`.

- [ ] **Step 4: Wire controller routes + DTO validation.**

- [ ] **Step 5: Manual smoke** — lock run, pay one line → `PARTIALLY_PAID`; pay rest → `PAID`.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(api): per-line payroll payment and branch payment summary"
```

---

### Task 6: Dashboard — Pay groups + employee fields

**Files:**
- Create pay-groups pages + `PayGroupForm` + `lib/timegate/pay-groups.ts`
- Modify: `navigation.ts`, `route-guard.ts`, `EmployeeForm.tsx`, types

**Interfaces:**
- Consumes: `/pay-groups` API
- Produces: ADMIN UI CRUD; employee form SelectSearch for group + NumberInput override.

- [ ] **Step 1: Client helpers + types `PayGroup`.**

- [ ] **Step 2: List/new/edit pages** following compensation-grid patterns; breadcrumb « Groupes de paie ».

- [ ] **Step 3: Nav item under Paie + route guard ADMIN.**

- [ ] **Step 4: Employee form fields.**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(dashboard): manage pay groups and employee pay schedule"
```

---

### Task 7: Dashboard — mass banner + payment table on run detail + list columns

**Files:**
- Create: `PayrollRunMassBanner.tsx`, `PayrollLinesPaymentTable.tsx`, `PayrollBranchPaymentSummary.tsx`
- Modify: `payroll-runs/[id]/page.tsx`, `payroll-runs/page.tsx`, `payroll-runs.ts`, types

**Interfaces:**
- Consumes: run `totals`, lines with payment fields, `markLinesPaid`, `paymentSummaryByBranch`
- Produces: checkbox multi-select, select-all (filtered rows), mark paid, branch unpaid list, list columns brut/net/progression.

- [ ] **Step 1: Mass banner** showing gross, net, breakdown, `paidCount/linesCount`.

- [ ] **Step 2: Payment table** — filters (SelectSearch branch, payment status, etc.), checkboxes, actions.

- [ ] **Step 3: Branch summary panel.**

- [ ] **Step 4: List page columns** for `totals.totalGross`, `totals.totalNet`, progress text.

- [ ] **Step 5: Replace whole-run mark paid button** with “Marquer toutes les lignes non payées” confirmation calling mark-lines-paid with all unpaid ids (or dedicated wrapper).

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(dashboard): show payroll mass and deferred payment UX"
```

---

### Task 8: Home ADMIN KPI + sparkline series

**Files:**
- Modify: `api/src/dashboard/dashboard.service.ts`
- Modify: `dashboard/app/(authenticated)/page.tsx` (+ types for home payload)

**Interfaces:**
- Produces on `home()` when `user.role === ADMIN`:
```ts
payrollMass: {
  year: number
  month: number
  status: string
  runId: string
  totalGross: number
  totalNet: number
} | null
payrollMassSeries: Array<{ year: number; month: number; totalGross: number; status: string }>
```
- Latest non-DRAFT run by `(year, month)` desc among LOCKED|PARTIALLY_PAID|PAID; series last 6 calendar months (0 if missing).

- [ ] **Step 1: Extend dashboard service query.**

- [ ] **Step 2: Render ADMIN-only card** on home linking to `/payroll-runs` or run detail; simple sparkline (CSS bars or existing chart pattern if any — prefer minimal bar row, no new heavy chart lib).

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add admin home payroll mass KPI"
```

---

### Task 9: Notifications — due soon / overdue (inbox + email)

**Files:**
- Modify: `api/src/notifications/notifications.service.ts`
- Modify: schedule/cron entrypoint (find existing `@Cron` / schedule module in API and extend)

**Interfaces:**
- Produces: for each unpaid line on non-DRAFT run, when due date matches J-3/J-1 → `PAYROLL_DUE_SOON`; when today > dueDate and still UNPAID → `PAYROLL_OVERDUE` (emit once per day key).
- Recipients: company ADMINs (same pattern as other HR admin alerts).
- Channels: in-app notification + `MailService` email.

- [ ] **Step 1: Add `notifyPayrollDueAlerts(now = new Date())` method** with dedupe lookup on existing notifications for type+entityId+day.

- [ ] **Step 2: Register daily cron** calling it.

- [ ] **Step 3: Ensure notification rules UI** lists new types if rules are enum-driven automatically.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(api): payroll due-soon and overdue alerts via inbox and email"
```

---

### Task 10: Copilot — nine ADMIN payroll tools

**Files:**
- Modify: `api/src/ai/ai-tool.registry.ts`
- Modify: `api/src/ai/ai-copilot.service.ts`
- Modify: dashboard Copilot suggestions (search `CopilotSuggestions` / suggestion chips)

**Interfaces:**
- Produces tools (names exact):
  1. `get_payroll_mass`
  2. `get_payroll_payment_status`
  3. `get_payroll_due_alerts`
  4. `list_payroll_runs`
  5. `compare_payroll_months`
  6. `get_payroll_by_branch`
  7. `get_pay_groups`
  8. `get_employee_compensation`
  9. `get_upcoming_pay_dues`
- Gate: if `user.role !== ADMIN`, omit these tools from definitions (or refuse execution).
- Each returns structured data + `sources` / deep link to `/payroll-runs/...`.

- [ ] **Step 1: Register definitions** in `AiToolRegistry.getDefinitions` (ADMIN branch).

- [ ] **Step 2: Implement `execute` cases** reusing PayrollRunsService / PayGroupsService / compensation services — no raw unsanitized SQL; always `companyId` from user.

- [ ] **Step 3: Add FR suggestion chips** for Brazzaville unpaid / mass compare.

- [ ] **Step 4: Smoke** — MANAGER session must not see tools; ADMIN can ask “masse juillet”.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ai): add admin payroll mass and payment status tools"
```

---

### Task 11: UC / regression smoke

**Files:**
- Modify: `api/scripts/test/sections/uc07-payroll.mjs` (extend)
- Optional: small dashboard manual checklist in PR description

- [ ] **Step 1: Extend UC-07** — create pay group, assign employee, create+lock run, assert totals present, mark one line paid, assert `PARTIALLY_PAID`, branch summary unpaid contains employee.

- [ ] **Step 2: Run** `bun run test:use-cases` (or project’s e2e script for UC-07) against e2e DB.

- [ ] **Step 3: Commit**

```bash
git commit -m "test: cover payroll mass totals and partial line payments"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Denormalized run totals | 1, 2, 4 |
| Pay groups CRUD | 3, 6 |
| Employee group + override | 4, 6 |
| dueDate on lines | 2, 4 |
| Per-line paidAt / select-all UX | 5, 7 |
| Branch unpaid visibility | 5, 7 |
| List + detail mass UI | 7 |
| Home KPI + sparkline | 8 |
| Inbox + email alerts | 9 |
| 9 Copilot tools ADMIN | 10 |
| UC coverage | 11 |

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-30-payroll-mass-and-deferred-payments.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
