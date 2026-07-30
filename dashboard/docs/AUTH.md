# Authentification (NextAuth + TimeGate API)

## Vue d'ensemble

| Couche | Fichier | Rôle |
|--------|---------|------|
| Config Edge | `auth.config.ts` | Pages, cookies app, session JWT, callbacks de base |
| Config serveur | `auth.ts` | Credentials → `POST /auth/login`, me + abo, refresh |
| Route | `app/api/auth/[...nextauth]/route.ts` | Handlers Auth.js v5 |
| Middleware | `middleware.ts` | Garde via `lib/auth/route-guard.ts` |
| Client HTTP | `lib/http/index.ts` | `http` — Bearer session |
| Auth API | `lib/auth/timegate-auth.ts` | Login, me, subscription, activate, signup, logout |
| Types | `types/next-auth.d.ts` | `accessToken`, `refreshToken`, rôle, abo |

## Variables d'environnement

- `AUTH_SECRET` — obligatoire, **unique à cette app** (ne pas partager avec `console/`)
- `AUTH_URL` / `NEXTAUTH_URL` — URL publique du dashboard
- `NEXT_PUBLIC_TIMEGATE_API_URL` — base API (ex. `http://localhost:4001/api/v1`)
- `AUTH_REFRESH_ENABLED` — défaut **activé** (`false` pour désactiver)
- `AUTH_ACCESS_TOKEN_TTL_SECONDS` — défaut `28800` (8h), aligné sur `JWT_EXPIRES_IN`
- `AUTH_REFRESH_TOKEN_TTL_SECONDS` — défaut `2592000` (30j), aligné sur `JWT_REFRESH_EXPIRES_IN`
- `AUTH_SESSION_MAX_AGE_SECONDS` — override optionnel de `session.maxAge`
- `AUTH_REFRESH_BUFFER_SECONDS` — défaut `60` (rafraîchir avant expiration)

## Cookies

Noms préfixés `timegate-dashboard.*` (`lib/auth/cookies.ts`) pour éviter les collisions NextAuth avec la console sur le même hôte (localhost / domaine partagé).

## Flux login

1. Formulaire `/login` → `signIn('credentials', { email, password, sku?, redirect: false })`
2. `authorize()` appelle `POST /auth/login`, puis `/auth/me` + `/auth/subscription-status`
3. Rôles hors dashboard (ex. `PLATFORM_ADMIN`) → refus (`null`)
4. Session JWT : `accessToken`, `refreshToken`, `accessTokenExpires`, user + flags abonnement

## Refresh token

Activé par défaut. Avant l’expiration du JWT d’accès (± buffer), le callback `jwt` appelle `POST /auth/refresh` (rotation) via `lib/auth/refresh-access-token.ts`. Échec → `session.error = RefreshAccessTokenError` → `/login`.

Côté API : `JWT_EXPIRES_IN` (accès), `JWT_REFRESH_EXPIRES_IN` (refresh, défaut `30d`). Seul le hash SHA-256 du refresh token est stocké.

## Logout

- UI : `signOut({ callbackUrl: '/login' })`
- Event `signOut` → `POST /auth/logout` avec le refresh token (révocation best-effort)

## Session expirée côté client

Si `session.error === 'RefreshAccessTokenError'`, rediriger vers `/login`.
