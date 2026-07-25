# Employee-app e2e (Maestro) + unit tests (Jest)

## Unit tests (CI)

```bash
cd employee-app
bun install
bun run test
```

Covers deep-links, email validation, QR prefix, offline-error detection for the
sensitive flows (login / QR / break).

## Device e2e (Maestro)

Prerequisites:

1. Install [Maestro CLI](https://maestro.mobile.dev/)
2. Native build on emulator/device: `bun run android`
3. API reachable from the device (`bun run start:dev` in `api/`)
4. Seeded employee: `patrick.mukendi@sotrafer.cg` / `ChangeMe123!`

```bash
cd employee-app
export EMPLOYEE_EMAIL=patrick.mukendi@sotrafer.cg
export EMPLOYEE_PASSWORD='ChangeMe123!'
maestro test .maestro/login.yaml
maestro test .maestro/qr-punch-open.yaml
maestro test .maestro/break-resume-open.yaml
```

Or all smoke flows:

```bash
maestro test .maestro/ --include-tags=smoke
```

Notes:

- Login flow clears app state.
- QR / break flows open the screens via home CTAs (`testID`); they do not assert
  a successful punch (needs camera + trusted device + live kiosk QR).
