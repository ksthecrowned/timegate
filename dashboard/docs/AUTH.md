# Authentification (NextAuth + ride-api)

## Vue d'ensemble

| Couche | Fichier | Rôle |
|--------|---------|------|
| Config Edge | `auth.config.ts` | Pages, session JWT, garde `/dashboard` |
| Config serveur | `auth.ts` | Credentials → `POST /api/admins/auth/login`, refresh, logout |
| Route | `app/api/auth/[...nextauth]/route.ts` | Handlers Auth.js v5 |
| Middleware | `middleware.ts` | Redirige non connectés vers `/login` |
| Client HTTP | `lib/http/index.ts` | `http` — fetch unique, Bearer session, parse `ApiEnvelope` |
| Types | `types/next-auth.d.ts` | `accessToken`, `roleTitle`, erreurs refresh |

## Variables d'environnement

Copier `.env.example` vers `.env.local` et renseigner :

- `AUTH_SECRET` — obligatoire (`openssl rand -base64 32`)
- `AUTH_URL` / `NEXTAUTH_URL` — URL du dashboard
- `RIDE_API_URL` — base API (prod : `https://ride-api-v2-2jsrx7vy7a-bq.a.run.app`, [Swagger admin](https://ride-api-v2-2jsrx7vy7a-bq.a.run.app/api-docs/admin))
- `RIDE_API_PREFIX` — défaut `/api`

## Flux login

1. Formulaire `/login` → `signIn('credentials', { email, password, redirect: false })`
2. `authorize()` appelle `POST {RIDE_API}/admins/auth/login`
3. JWT session stocke `accessToken`, `refreshToken` (si fourni), `accessTokenExpires`

## Refresh token (préparé)

L'API **ne renvoie pas encore** de `refreshToken`. Quand ride-api l'ajoutera :

1. Retourner `{ accessToken, refreshToken, admin }` au login
2. Implémenter `POST /api/admins/auth/refresh` avec body `{ refreshToken }`
3. Mettre `AUTH_REFRESH_ENABLED=true` dans `.env.local`
4. Optionnel : `POST /api/admins/auth/logout` pour révoquer le refresh

Fichiers concernés : `lib/auth/ride-api-auth.ts`, `lib/auth/refresh-access-token.ts`, `auth.ts` (callback `jwt` + event `signOut`).

## Logout

- UI : `signOut({ callbackUrl: '/login' })` (voir `Navbar.tsx`)
- Event `signOut` dans `auth.ts` appelle `logoutAdmin()` si l'endpoint existe

## Session expirée côté client

Si `session.error === 'RefreshAccessTokenError'`, rediriger vers `/login` (ex. dans un layout dashboard ou `SessionProvider`).

## Prochaines étapes suggérées

- [ ] Remplacer les mocks par `http.get('/admins/...')` (voir `lib/http/index.ts`)
- [ ] Ajouter `SessionProvider` si besoin de `useSession` côté client
- [ ] Implémenter refresh/logout dans ride-api
