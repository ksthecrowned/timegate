# Client HTTP (`@/lib/http`)

Un seul point d'entrée pour tous les appels ride-api :

```typescript
import { http, HttpError } from '@/lib/http'

// GET avec query params
const list = await http.get<Admin[]>('/admins/users', { params: { page: 1 } })

// POST JSON
const created = await http.post<Admin>('/admins/users', { email, name })

// PUT / PATCH / DELETE
await http.put(`/admins/users/${id}`, payload)
await http.patch(`/admins/users/${id}`, { status: 'active' })
await http.delete(`/admins/users/${id}`)

// Sans authentification (login public, etc.)
await http.post('/admins/auth/login', body, { skipAuth: true })

// Token explicite (callbacks NextAuth)
await http.get('/admins/auth/me', { accessToken: token })
```

## Comportement

- Base URL : `RIDE_API_URL` + `RIDE_API_PREFIX` (voir `.env.example`)
- Bearer : session NextAuth (`auth()` serveur, `getSession()` client à l'appel)
- Réponses : déballage automatique de `{ data, message, statusCode }`
- Erreurs : `HttpError` avec `status` et `body`
- Session expirée : `HttpSessionError` (401)

## Où l'utiliser

| Contexte | Import |
|----------|--------|
| Server Components, Server Actions, Route Handlers | `import { http } from '@/lib/http'` |
| Composants `'use client'` | même import — `getSession()` est appelé à la demande, sans hook |

Préférer les Server Actions pour les mutations depuis le client quand c'est possible.
