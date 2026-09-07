# Design — API Nest Express → Fastify

**Date:** 2026-09-07  
**Status:** implemented (pending validation checklist)  
**Package:** `api/`

## Goals

- Drop Express (`@nestjs/platform-express`) for Fastify (`@nestjs/platform-fastify`)
- Drivers: performance + Bun/platform alignment (single chantier)
- Keep client contracts: same multipart field names and size limits

## Approach

1. Bootstrap with `FastifyAdapter` + `@fastify/multipart`
2. Custom `FastifyFileInterceptor` + `@UploadedBinaryFile()` (cannot use `req.file` — reserved by multipart)
3. Shared `UploadedFile` type (`buffer`, `mimetype`, `originalname`, `size`) replacing `Express.Multer.File`
4. Health uses `FastifyReply`; request-id via Fastify `onRequest` hook
5. Swagger via Nest + `@fastify/static` (no `swagger-ui-express`)

## Upload field compatibility (unchanged)

| Route | Field | Max |
|-------|-------|-----|
| `POST /auth/kiosk/verify` | `photo` | 12 MB |
| `POST /face/enroll`, `POST /face/verify` | `photo` | 12 MB |
| `POST/PATCH …/contracts` | `contractFile` | 10 MB |
| `POST /companies/me/logo` | `logo` | 2 MB |
| `POST …/upload-justification` | `file` | 5 MB |
| `POST /employee/leaves` | `supportDocument` | 5 MB |

## Validation checklist (before merge)

- [ ] `cd api && bunx nest build`
- [ ] `bun run start:dev` — `/health` 200, `/api/v1/docs` loads
- [ ] `bun run test:use-cases` (or `:e2e` if DB available)
- [ ] Smoke: dashboard logo upload
- [ ] Smoke: face enroll or kiosk verify photo
- [ ] Smoke: SSE `GET /api/v1/auth/kiosk/events` (kiosk stays connected)
- [ ] Smoke: employee leave with support document (optional)

## Out of scope (follow-ups)

- Streaming uploads straight to R2 (buffers kept for face engine parity)
- Nest 11 / Fastify 5 bump
