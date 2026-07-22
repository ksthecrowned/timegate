# Client HTTP (`@/lib/http`)

Un seul point d'entrée pour les appels TimeGate API :

```typescript
import { http, HttpError } from '@/lib/http'

// GET avec query params
const list = await http.get<Employee[]>('/employees', { params: { page: 1 } })

// POST JSON
const created = await http.post<Employee>('/employees', payload)

// PUT / PATCH / DELETE
await http.put(`/employees/${id}`, payload)
await http.patch(`/employees/${id}`, { isActive: true })
await http.delete(`/employees/${id}`)

// Sans authentification (login public, etc.)
await http.post('/auth/login', body, { skipAuth: true })

// Token explicite (callbacks NextAuth)
await http.get('/auth/me', { accessToken: token })
```

## Comportement

- Base URL : `NEXT_PUBLIC_TIMEGATE_API_URL` (voir `.env.example`)
- Bearer : session NextAuth (`auth()` serveur, `getSession()` client à l'appel)
- Réponses : JSON brut TimeGate, ou déballage de `{ data, message, statusCode }` si enveloppe legacy
- Erreurs : `HttpError` avec `status` et `body`
- Session expirée : `HttpSessionError` (401)

## Où l'utiliser

| Contexte | Import |
|----------|--------|
| Server Components, Server Actions, Route Handlers | `import { http } from '@/lib/http'` |
| Composants `'use client'` | même import — `getSession()` est appelé à la demande, sans hook |

Préférer les Server Actions pour les mutations depuis le client quand c'est possible.
