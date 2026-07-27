# Kit pilote TimeGate

Deux dossiers distincts — **ne pas tout envoyer au client**.

| Dossier | Destinataire | Contenu |
|---------|--------------|---------|
| **[`remise-client/`](./remise-client/)** | **L’entreprise pilote** | Périmètre, accès, scénarios UAT, feuille de retour |
| **[`interne/`](./interne/)** | **Équipe TimeGate seulement** | Avant remise, staging, sécurité |

## Workflow

1. TimeGate : [`interne/00-avant-remise.md`](./interne/00-avant-remise.md) (checklist courte) → détail [`interne/02-staging-checklist.md`](./interne/02-staging-checklist.md).
2. Remplir les URL / comptes dans [`remise-client/03-acces.md`](./remise-client/03-acces.md) (copie privée si mots de passe réels).
3. **Transmettre uniquement** le dossier `remise-client/`.
4. Fin de pilote : feuille de retour + critères Go/No-Go du périmètre.

## Hors priorité (ne pas promettre)

- Intégration **SIRH** — backlog P3 (`TODOS.md` · Lot H #6), après pilote terrain validé.
- Accès client à l’API / Swagger / Console — réservé TimeGate.
- **E2E UI** (Playwright dashboard / apps) — **non** ; automatisation réservée à l’API (`bun run test:use-cases`).

## Références internes

- Cas d’usage API : [`api/docs/use-cases-test.md`](../../api/docs/use-cases-test.md)
- Seed : `cd api && bun run prisma:seed`
