---
status: stable
last-verified: 2026-09-04
owner: timegate@kiosk
scope: setup
audience: agents
---

# provisioning

## Flow

1. `POST /auth/kiosk/bootstrap` (opérateur ADMIN/MANAGER + SKU) → branches
2. `POST /auth/kiosk/provision` → stocker `lifetime_token`
3. Heartbeat ~90s ; revoke / 401 → clear local + re-setup

UI : `hooks/useKioskHome.ts`, `components/setup/KioskProvisionForm.tsx`, `app/index.tsx`.

## Anti-patterns

- ❌ Skip re-provision après révocation
- ❌ Partager un token kiosk entre devices

---

> **Mainteneur** : timegate@kiosk — 90 jours.
> **Source de vérité** : le code.
