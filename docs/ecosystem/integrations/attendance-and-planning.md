# Intégration — Attendance & planning

## Domaine

Présence (événements kiosk / claims), retards, absences, planning shifts, timesheets, congés.

## Modules API (indicatif)

| Domaine | Modules |
|---------|---------|
| Pointage | `attendance/`, `punch-claims/`, `late-records/`, `absences/` |
| Planning | `work-schedules/` (shift-types), `work-days/`, `shift-locations/`, `shift-assignments/`, `schedule-day-exceptions/`, `planning/`, `shift-swaps/`, `holidays/` |
| Congés | `leaves/`, `leave-types/` |
| Timesheets | `timesheets/` |

Carte complète : `../reference/api-module-map.md`.

## Acteurs

| Qui | Quoi |
|-----|------|
| Kiosk | Crée attendance events via verify |
| Dashboard ADMIN/MANAGER | RH, planning, validations |
| employee-app | Consulte pointages, demande congés, QR punch |
| Manager API | `src/manager/` — vues manager |

## Règles métier à connaître

- Fenêtre anti-doublon : `DUPLICATE_ATTENDANCE_WINDOW_SECONDS`
- Flag : `TIMEGATE_ALLOW_CHECKIN_AFTER_BREAK_START`
- Branch porte timezone / geo ; événements rattachés company + branch

## Doc liée

- Métier planning : `../metier/planning-et-horaires.md`
- Specs QR / trusted device : `../superpowers/specs/`
