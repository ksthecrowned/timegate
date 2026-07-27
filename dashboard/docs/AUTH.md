# Authentification (NextAuth + TimeGate API)

## Vue d'ensemble

| Couche | Fichier | Rôle |
|--------|---------|------|
| Config Edge | `auth.config.ts` | Pages, cookies app, session JWT, callbacks de base |
| Config serveur | `auth.ts` | Credentials → `POST /auth/login`, me + abo, refresh optionnel |
| Route | `app/api/auth/[...nextauth]/route.ts` | Handlers Auth.js v5 |
| Middleware | `middleware.ts` | Garde via `lib/auth/route-guard.ts` |
| Client HTTP | `lib/http/index.ts` | `http` — Bearer session |
| Auth API | `lib/auth/timegate-auth.ts` | Login, me, subscription, activate, signup |
| Types | `types/next-auth.d.ts` | `accessToken`, rôle, champs abonnement |

## Variables d'environnement

Voir `.env.example` :

- `AUTH_SECRET` — obligatoire, **unique à cette app** (ne pas partager avec `console/`)
- `AUTH_URL` / `NEXTAUTH_URL` — URL publique du dashboard
- `NEXT_PUBLIC_TIMEGATE_API_URL` — base API (ex. `http://localhost:4001/api/v1`)
- `AUTH_REFRESH_ENABLED` — défaut `false` (pas de refresh côté API)

## Cookies

Noms préfixés `timegate-dashboard.*` (`lib/auth/cookies.ts`) pour éviter les collisions NextAuth avec la console sur le même hôte (localhost / domaine partagé).

## Flux login

1. Formulaire `/login` → `signIn('credentials', { email, password, sku?, redirect: false })`
2. `authorize()` appelle `POST /auth/login`, puis `/auth/me` + `/auth/subscription-status`
3. Rôles hors dashboard (ex. `PLATFORM_ADMIN`) → refus (`null`)
4. Session JWT : `accessToken`, `accessTokenExpires`, user + flags abonnement

## Refresh token

Désactivé par défaut. Si `AUTH_REFRESH_ENABLED=true` et qu’un endpoint refresh existe : `lib/auth/refresh-access-token.ts` + callback `jwt` dans `auth.ts`. Sinon, à l’expiration → déconnexion / `SessionExpired`.

## Logout

- UI : `signOut({ callbackUrl: '/login' })`
- Event `signOut` dans `auth.ts` peut appeler `logoutAdmin()` si l’API le supporte

## Session expirée côté client

Si `session.error === 'RefreshAccessTokenError'`, rediriger vers `/login`.
