# Dashboard Product Tour (Start tour) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la V1 driver.js one-shot par un onboarding multi-pages interactif (Admin / Manager), textes vendeurs explicatifs, tour dashboard, save org requis, UI TimeGate.

**Architecture:** State machine `TourController` + catalogues déclaratifs + driver.js (spotlight seulement) + persistence `localStorage` scopée user/rôle. Étapes typées : `spotlight` | `navigate` | `awaitAction` | `requireSave` | `celebrate`.

**Tech Stack:** Next.js 15 App Router, React 18, driver.js, TypeScript, Tailwind (design system teal/slate existant). Tests unitaires purs : Node built-in `node:test` sur `lib/tour/*` (pas de runner dashboard aujourd’hui).

## Global Constraints

- Spec source: `docs/superpowers/specs/2026-07-26-dashboard-product-tour-design.md` (approuvée).
- Copy FR : titre vendeur + corps **2–4 phrases** qui **décrivent l’élément pointé** (pas de one-liners).
- UI popover ~360–400px, titres ~16–18px, texte ~14px, match `tg-card` / primary teal.
- Writes API pendant le tour : **uniquement** save organisation volontaire (`requireSave`).
- Ouvrir formulaires employés/branches OK ; **ne jamais** forcer leur sauvegarde.
- Deux catalogues : Admin + Manager ; sélection via `session.user.role`.
- Remplacer / absorber `dashboard/lib/product-tour.ts` V1.
- Commits fréquents, un commit par tâche.
- Ne pas committer `.env` / secrets.

---

## File Map

| File | Responsibility |
|------|----------------|
| `dashboard/lib/tour/types.ts` | Types étapes, état, rôle |
| `dashboard/lib/tour/storage.ts` | Read/write localStorage v2 |
| `dashboard/lib/tour/storage.test.ts` | Tests storage |
| `dashboard/lib/tour/dom.ts` | waitForSelector, isVisible |
| `dashboard/lib/tour/events.ts` | `tour:org-saved` CustomEvent helpers |
| `dashboard/lib/tour/controller.ts` | State machine + driver.js |
| `dashboard/lib/tour/controller.test.ts` | Tests résolution d’étapes / skip |
| `dashboard/lib/tour/catalogs/dashboard.ts` | Étapes communes home |
| `dashboard/lib/tour/catalogs/admin.ts` | Parcours Admin |
| `dashboard/lib/tour/catalogs/manager.ts` | Parcours Manager |
| `dashboard/lib/tour/index.ts` | Public API `startProductTour`, etc. |
| `dashboard/components/tour/StartTourButton.tsx` | Bouton (réécrire) |
| `dashboard/components/tour/TourProgressChip.tsx` | Chip progression |
| `dashboard/components/tour/TourResumeModal.tsx` | Reprendre / recommencer |
| `dashboard/components/tour/OrgSetupReminderBanner.tsx` | Rappel org skipped |
| `dashboard/components/tour/ProductTourBootstrap.tsx` | Auto-start / resume |
| `dashboard/app/globals.css` | Styles `.tg-driver-popover` (élargir) |
| Pages listées ci-dessous | `data-tour` / `data-tour-action` |
| Delete or thin | `dashboard/lib/product-tour.ts` (V1) |

**Pages à ancrer :**  
`app/(authenticated)/page.tsx`, `organization/page.tsx`, `employees/page.tsx`, `branches/page.tsx`, `kiosks/page.tsx`, `attendance/events` (liste), `manager/inbox`, `manager/team`, `manager/leaves`, `planning/page.tsx`, `GlobalSearchBox`, `NotificationBell`, `AddPageLink` (prop optionnelle `tourAction`).

---

### Task 1: Types + storage + tests

**Files:**
- Create: `dashboard/lib/tour/types.ts`
- Create: `dashboard/lib/tour/storage.ts`
- Create: `dashboard/lib/tour/storage.test.ts`
- Modify: `dashboard/package.json` (script `test:tour`)

**Interfaces:**
- Produces: `TourStep`, `TourPersistedState`, `storageKey`, `loadTourState`, `saveTourState`, `clearTourState`

- [ ] **Step 1: Write types**

```ts
// dashboard/lib/tour/types.ts
export type TourRole = 'ADMIN' | 'MANAGER'

export type TourStepType =
  | 'spotlight'
  | 'navigate'
  | 'awaitAction'
  | 'requireSave'
  | 'celebrate'

export type TourStep = {
  id: string
  type: TourStepType
  /** Module label for progress chip, e.g. "Dashboard" */
  module: string
  title: string
  description: string
  /** CSS selector; omit for celebrate / centered welcome */
  element?: string
  path?: string
  /** Selector that must be clicked (awaitAction) */
  actionSelector?: string
  /** Event name to wait for (requireSave), default tour:org-saved */
  saveEvent?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  /** If true, missing element fails hard instead of soft-skip */
  required?: boolean
}

export type TourStatus = 'idle' | 'running' | 'completed' | 'dismissed'

export type TourPersistedState = {
  status: TourStatus
  stepId: string | null
  orgSetupSkipped?: boolean
  orgReminderShown?: boolean
  updatedAt: string
}
```

- [ ] **Step 2: Write failing storage tests**

```ts
// dashboard/lib/tour/storage.test.ts
import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import {
  storageKey,
  loadTourState,
  saveTourState,
  clearTourState,
} from './storage'

describe('tour storage', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    // @ts-expect-error test polyfill
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
  })

  it('scopes key by user and role', () => {
    assert.equal(
      storageKey('u1', 'ADMIN'),
      'timegate.dashboard.tour.v2:u1:ADMIN',
    )
  })

  it('round-trips state', () => {
    saveTourState('u1', 'ADMIN', {
      status: 'running',
      stepId: 'dash-today',
      updatedAt: '2026-07-26T00:00:00.000Z',
    })
    const loaded = loadTourState('u1', 'ADMIN')
    assert.equal(loaded?.stepId, 'dash-today')
    assert.equal(loaded?.status, 'running')
  })

  it('clear removes state', () => {
    saveTourState('u1', 'ADMIN', {
      status: 'completed',
      stepId: null,
      updatedAt: '2026-07-26T00:00:00.000Z',
    })
    clearTourState('u1', 'ADMIN')
    assert.equal(loadTourState('u1', 'ADMIN'), null)
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL (module missing)**

Run: `cd dashboard && node --import tsx --test lib/tour/storage.test.ts`  
(If `tsx` missing: `npm i -D tsx` then re-run.)  
Expected: FAIL cannot find module `./storage`

- [ ] **Step 4: Implement storage**

```ts
// dashboard/lib/tour/storage.ts
import type { TourPersistedState, TourRole } from './types'

export function storageKey(userId: string, role: TourRole): string {
  return `timegate.dashboard.tour.v2:${userId}:${role}`
}

export function loadTourState(
  userId: string,
  role: TourRole,
): TourPersistedState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(userId, role))
    if (!raw) return null
    return JSON.parse(raw) as TourPersistedState
  } catch {
    return null
  }
}

export function saveTourState(
  userId: string,
  role: TourRole,
  state: TourPersistedState,
): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(userId, role), JSON.stringify(state))
  } catch {
    // private mode / quota
  }
}

export function clearTourState(userId: string, role: TourRole): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(storageKey(userId, role))
  } catch {
    // ignore
  }
}
```

- [ ] **Step 5: Add script + run tests PASS**

In `dashboard/package.json` scripts:
```json
"test:tour": "node --import tsx --test lib/tour/**/*.test.ts"
```

Run: `cd dashboard && npm i -D tsx && npm run test:tour`  
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add dashboard/lib/tour/types.ts dashboard/lib/tour/storage.ts dashboard/lib/tour/storage.test.ts dashboard/package.json dashboard/package-lock.json
git commit -m "feat(dashboard): add product tour storage and types"
```

---

### Task 2: DOM helpers + org save events

**Files:**
- Create: `dashboard/lib/tour/dom.ts`
- Create: `dashboard/lib/tour/events.ts`
- Modify: `dashboard/app/(authenticated)/organization/page.tsx` (dispatch after successful save)

**Interfaces:**
- Consumes: none from Task 1 beyond types optional
- Produces: `waitForSelector`, `isElementVisible`, `ORG_SAVED_EVENT`, `emitOrgSaved`, `onOrgSaved`

- [ ] **Step 1: Implement dom helpers**

```ts
// dashboard/lib/tour/dom.ts
export function isElementVisible(el: Element): boolean {
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

export function waitForSelector(
  selector: string,
  timeoutMs = 4000,
): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector)
    if (existing && isElementVisible(existing)) {
      resolve(existing)
      return
    }
    const started = Date.now()
    const timer = window.setInterval(() => {
      const el = document.querySelector(selector)
      if (el && isElementVisible(el)) {
        window.clearInterval(timer)
        resolve(el)
        return
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer)
        resolve(null)
      }
    }, 150)
  })
}
```

- [ ] **Step 2: Implement events**

```ts
// dashboard/lib/tour/events.ts
export const ORG_SAVED_EVENT = 'tour:org-saved'

export function emitOrgSaved(): void {
  window.dispatchEvent(new CustomEvent(ORG_SAVED_EVENT))
}

export function onOrgSaved(handler: () => void): () => void {
  const listener = () => handler()
  window.addEventListener(ORG_SAVED_EVENT, listener)
  return () => window.removeEventListener(ORG_SAVED_EVENT, listener)
}
```

- [ ] **Step 3: Dispatch after org save success**

In `organization/page.tsx` `handleSave`, after `await reload()` and success message:

```ts
import { emitOrgSaved } from '@/lib/tour/events'
// ...
await updateMyCompany(form)
await reload()
setSuccess('Configuration enregistrée.')
emitOrgSaved()
```

Also add `data-tour="org-form"` on the `<form>` wrapping identity fields.

- [ ] **Step 4: Manual check**

Run dashboard, open `/organization`, save → in DevTools `window.addEventListener('tour:org-saved', () => console.log('ok'))` must log.

- [ ] **Step 5: Commit**

```bash
git add dashboard/lib/tour/dom.ts dashboard/lib/tour/events.ts dashboard/app/(authenticated)/organization/page.tsx
git commit -m "feat(dashboard): tour DOM helpers and org-saved event"
```

---

### Task 3: TourController (core)

**Files:**
- Create: `dashboard/lib/tour/controller.ts`
- Create: `dashboard/lib/tour/controller.test.ts`
- Create: `dashboard/lib/tour/index.ts`

**Interfaces:**
- Consumes: types, storage, dom, events
- Produces: `createTourController`, `TourController` with `start({ force?, resumeFromStepId? })`, `stop()`, `getProgress()`

- [ ] **Step 1: Write tests for step filtering / progress**

```ts
// dashboard/lib/tour/controller.test.ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { TourStep } from './types'
import { filterAvailableSteps, progressLabel } from './controller'

const steps: TourStep[] = [
  { id: 'a', type: 'celebrate', module: 'Intro', title: 'A', description: '…' },
  {
    id: 'b',
    type: 'spotlight',
    module: 'Dashboard',
    title: 'B',
    description: '…',
    element: '[data-tour="missing"]',
  },
]

describe('filterAvailableSteps', () => {
  it('keeps celebrate without element', () => {
    const out = filterAvailableSteps(steps, () => null)
    assert.equal(out.length, 1)
    assert.equal(out[0].id, 'a')
  })
})

describe('progressLabel', () => {
  it('formats module and index', () => {
    assert.equal(progressLabel(steps[0], 0, 5), 'Intro · 1/5')
  })
})
```

- [ ] **Step 2: Run — FAIL missing exports**

Run: `cd dashboard && npm run test:tour`  
Expected: FAIL

- [ ] **Step 3: Implement controller**

Implement `filterAvailableSteps(steps, queryFn)` and `progressLabel`.

Implement `createTourController({ userId, role, steps, router })`:

```ts
export type TourRouter = { push: (href: string) => void }

export type TourController = {
  start: (opts?: { force?: boolean; resumeFromStepId?: string }) => Promise<void>
  stop: (reason: 'completed' | 'dismissed') => void
  getProgress: () => { index: number; total: number; label: string; step: TourStep | null }
  subscribe: (listener: () => void) => () => void
}
```

Behavior (must match spec):
1. Resolve steps via `filterAvailableSteps` using real `document.querySelector` + `isElementVisible` at **start of each step** (re-filter navigate targets after route).
2. `spotlight` / `celebrate`: `driver({ steps: [one], popoverClass: 'tg-driver-popover', … })` with FR buttons ; on next → advance.
3. `navigate`: `router.push(path)` → `waitForSelector(element)` → if null and !required soft-skip → else spotlight.
4. `awaitAction`: spotlight with **no Next** (or Next disabled) ; listen once for click on `actionSelector` → advance (user may navigate away via Link — still advance).
5. `requireSave`: spotlight ; listen `onOrgSaved` → advance ; show secondary « Plus tard » via `onPopoverRender` that sets `orgSetupSkipped` and advances.
6. Persist `running` + `stepId` on each advance ; `completed` / `dismissed` on stop.
7. Destroy driver instance between steps (`driverObj.destroy()`).

Export pure helpers used by tests from the same file.

- [ ] **Step 4: Run tests PASS**

Run: `cd dashboard && npm run test:tour`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard/lib/tour/controller.ts dashboard/lib/tour/controller.test.ts dashboard/lib/tour/index.ts
git commit -m "feat(dashboard): add product tour controller"
```

---

### Task 4: Catalogues (dashboard + admin + manager)

**Files:**
- Create: `dashboard/lib/tour/catalogs/dashboard.ts`
- Create: `dashboard/lib/tour/catalogs/admin.ts`
- Create: `dashboard/lib/tour/catalogs/manager.ts`
- Modify: `dashboard/lib/tour/index.ts` — `getTourStepsForRole(role)`

**Interfaces:**
- Produces: `dashboardTourSteps`, `adminTourSteps`, `managerTourSteps`, `getTourStepsForRole`

- [ ] **Step 1: Write `dashboard.ts` with long FR copy**

Include steps with ids:
- `dash-header` → `[data-tour="home-header"]`
- `dash-today` → `[data-tour="home-today"]`
- `dash-kpis` → `[data-tour="home-kpis"]`
- `dash-analytics` → `[data-tour="home-analytics"]` (soft skip if absent)
- `dash-quick` → `[data-tour="home-quick"]`

Each `description` ≥ 2 phrases explaining visible UI.

Example for `dash-today` (use verbatim or tighten slightly):

```ts
{
  id: 'dash-today',
  type: 'spotlight',
  module: 'Dashboard',
  element: '[data-tour="home-today"]',
  title: 'Le pouls de votre organisation',
  description:
    'Ce bandeau résume la journée : présents, absents, congés, retards, et ce qui attend une validation. Chaque tuile est cliquable pour plonger dans le détail. En bas, le statut des kiosques vous alerte si un terminal est hors ligne. C’est votre point de départ chaque matin pour savoir où concentrer votre attention.',
  side: 'bottom',
  align: 'start',
}
```

- [ ] **Step 2: Write `admin.ts`**

Order:
1. welcome `celebrate`
2. ...spread `dashboardTourSteps`
3. org navigate `/organization` + element `[data-tour="org-form"]` then separate `requireSave` step id `org-save` (or single step type `requireSave` with path+element)
4. employees navigate + awaitAction `data-tour-action="employees-new"`
5. branches navigate + awaitAction `data-tour-action="branches-new"`
6. kiosks spotlight
7. attendance events navigate
8. inbox navigate
9. celebrate done

All descriptions 2–4 sentences explaining the screen.

- [ ] **Step 3: Write `manager.ts`**

welcome → dashboard steps → team → inbox → leaves → events → planning → search + notifications spotlights → celebrate.

- [ ] **Step 4: `getTourStepsForRole`**

```ts
export function getTourStepsForRole(role: TourRole): TourStep[] {
  return role === 'ADMIN' ? adminTourSteps : managerTourSteps
}
```

- [ ] **Step 5: Commit**

```bash
git add dashboard/lib/tour/catalogs dashboard/lib/tour/index.ts
git commit -m "feat(dashboard): add Admin and Manager tour catalogs"
```

---

### Task 5: Popover UI + Progress chip + Start button

**Files:**
- Modify: `dashboard/app/globals.css` (`.tg-driver-popover` larger)
- Create: `dashboard/components/tour/TourProgressChip.tsx`
- Modify: `dashboard/components/tour/StartTourButton.tsx`
- Modify: `dashboard/app/(authenticated)/AuthenticatedShell.tsx` — mount chip

**Interfaces:**
- Consumes: controller subscribe / getProgress via React context **or** simple module-level listeners from controller instance held in `TourProvider`

- [ ] **Step 1: Add `TourProvider`**

Create `dashboard/components/tour/TourProvider.tsx`:
- Reads session user id + role
- Holds `TourController | null`
- Exposes `startTour({ force?: boolean })`, `progress`, `running`
- On mount, constructs controller with `useRouter()` from `next/navigation`

- [ ] **Step 2: Enlarge popover CSS**

Ensure `.tg-driver-popover` has `max-width: 400px`, title `font-size: 1.125rem`, description `font-size: 0.875rem`, padding generous, buttons `min-height: 40px`, primary teal.

- [ ] **Step 3: `TourProgressChip`**

Fixed bottom-center (or under navbar), only if `running`:
- Shows `progress.label`
- Button « Quitter » → `controller.stop('dismissed')`

- [ ] **Step 4: Rewrite `StartTourButton`**

Calls `startTour({ force: true })` from context. Navbar variant + page variant. Label « Start tour ».

- [ ] **Step 5: Wire provider in `AuthenticatedShell`**

Wrap children with `TourProvider` ; render `TourProgressChip`.

- [ ] **Step 6: Manual UI check**

Start tour → popover large readable ; chip visible ; Quitter stops.

- [ ] **Step 7: Commit**

```bash
git add dashboard/components/tour dashboard/app/globals.css dashboard/app/(authenticated)/AuthenticatedShell.tsx
git commit -m "feat(dashboard): tour UI provider, progress chip, popover styles"
```

---

### Task 6: Bootstrap, resume modal, org reminder

**Files:**
- Modify: `dashboard/components/tour/ProductTourBootstrap.tsx`
- Create: `dashboard/components/tour/TourResumeModal.tsx`
- Create: `dashboard/components/tour/OrgSetupReminderBanner.tsx`
- Modify: `dashboard/app/(authenticated)/page.tsx` — mount reminder

- [ ] **Step 1: Resume modal**

If `loadTourState` has `status === 'running'` and `stepId`, show modal:
- « Reprendre la visite » → `startTour({ resumeFromStepId })`
- « Recommencer » → clear + `startTour({ force: true })`
- « Plus tard » → dismiss modal only

- [ ] **Step 2: Bootstrap**

On `/` only:
- If completed/dismissed → no auto
- If running → resume modal (don’t auto-drive)
- If no state → wait for `[data-tour="home-today"]` then `startTour()`

- [ ] **Step 3: Org reminder banner**

If `orgSetupSkipped && !orgReminderShown` on home → banner « Finalisez la fiche organisation » CTA `/organization` ; on dismiss set `orgReminderShown: true`.

- [ ] **Step 4: Manual**

Clear storage → land on `/` → auto tour. Mid-tour refresh → resume modal. Skip org → banner once.

- [ ] **Step 5: Commit**

```bash
git add dashboard/components/tour dashboard/app/(authenticated)/page.tsx
git commit -m "feat(dashboard): tour bootstrap, resume, org reminder"
```

---

### Task 7: DOM anchors on pages

**Files:**
- Modify home, employees, branches, kiosks, attendance events list, manager pages, planning, AddPageLink, search, notifications

- [ ] **Step 1: Home `page.tsx`**

- Wrapper header → `data-tour="home-header"`
- Keep/ensure `home-today`, add `home-kpis` on KPI grid, `home-analytics` on charts wrapper, `home-quick`

- [ ] **Step 2: `AddPageLink`**

Add optional `tourAction?: string` → `data-tour-action={tourAction}` on the Link.

- [ ] **Step 3: List pages**

- employees: `tourAction="employees-new"` on AddPageLink
- branches: `tourAction="branches-new"`
- kiosks: `data-tour="kiosks-list"` on main card
- attendance/events: `data-tour="attendance-events"`
- manager/inbox, team, leaves, planning: matching `data-tour` used in catalogs

- [ ] **Step 4: Verify selectors** in browser DevTools `document.querySelector(...)` non-null for each catalog selector on the right page.

- [ ] **Step 5: Commit**

```bash
git add dashboard/app/(authenticated) dashboard/components/timegate/AddPageLink.tsx dashboard/components/layout
git commit -m "feat(dashboard): add data-tour anchors for product tour"
```

---

### Task 8: Remove V1 monolith + smoke Admin/Manager

**Files:**
- Delete: `dashboard/lib/product-tour.ts` (if fully replaced)
- Grep and update any remaining imports to `@/lib/tour`
- Fix TS

- [ ] **Step 1: Grep**

```bash
rg "product-tour" dashboard
```

Replace all with `@/lib/tour`.

- [ ] **Step 2: `tsc --noEmit`**

Run: `cd dashboard && npx tsc --noEmit -p tsconfig.json`  
Expected: no errors

- [ ] **Step 3: Smoke Admin**

1. Login ADMIN, clear `localStorage` keys `timegate.dashboard.tour.v2:*`
2. Open `/` → auto tour
3. Walk dashboard steps — texts long, UI large
4. Org page → save required (or Plus tard)
5. Employees → click Ajouter → advances
6. Continue to end → `completed`

- [ ] **Step 4: Smoke Manager**

Login MANAGER → tour without org requireSave → team/inbox/leaves/planning.

- [ ] **Step 5: Commit**

```bash
git add -A dashboard
git commit -m "refactor(dashboard): replace V1 product tour with orchestrated tour"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Orchestrateur + 5 step types | 3 |
| Catalogues Admin/Manager + long copy | 4 |
| Tour dashboard multi-étapes | 4 + 7 |
| Org requireSave | 2 + 3 + 4 |
| Nav multi-pages + awaitAction forms | 3 + 4 + 7 |
| Progress chip + Start tour | 5 |
| Auto-start / reprise localStorage | 1 + 6 |
| UI TimeGate large | 5 |
| Remplacement V1 | 8 |
| No other API writes | 3 + 4 (enforced by catalog) |

No TBD placeholders. Types consistent: `TourStep`, `TourPersistedState`, `ORG_SAVED_EVENT`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-26-dashboard-product-tour.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
