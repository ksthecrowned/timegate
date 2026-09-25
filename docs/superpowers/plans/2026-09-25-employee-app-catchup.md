# Employee-app catch-up (Phases 0–2 + pending RH) — Implementation Plan

> **For agentic workers:** implement task-by-task; checkboxes track progress.

**Goal:** Expose presence→timesheet→payroll read loop in employee-app without suite-RH parity.

**Architecture:** Extend `/employee/*` portal with colleagues, timesheets, payroll summary, pending-HR feed (JWT-scoped). Reuse TimesheetsService; payroll via Prisma non-DRAFT lines. App: home value cards + screens Mes heures / Paie / Réclamations / En attente RH.

**Tech Stack:** NestJS + Prisma · Expo employee-app · existing UI primitives.

## Global Constraints

- `employeeId` from JWT only (no client IDOR)
- Payroll: never expose `DRAFT` runs
- Colleagues: minimal projection (no email/phone)
- No GPS punch, no document vault, no advances self-service in this lot
- FR copy via `STRINGS`

## Files

| Area | Files |
|------|--------|
| API | `employee-portal.controller.ts`, `.service.ts`, `.module.ts` |
| App | `lib/api.ts`, `lib/types.ts`, `constants/strings.ts`, `components/DrawerMenu.tsx`, `app/_layout.tsx`, `app/(tabs)/index.tsx`, new screens |

## Tasks

- [x] Design locked via `docs/metier/employee-app-rattrapage.md`
- [x] API colleagues + timesheets + payroll + pending-hr + home-insights
- [x] App screens + home + drawer + swap colleagues
- [x] Typecheck employee-app + employee-portal clean
