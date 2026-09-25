import { BASE } from './helpers.mjs'

function healthUrlFromApiBase(apiBase) {
  try {
    const u = new URL(apiBase)
    // BASE is …/api/v1 — health is mounted at /health (hors préfixe)
    return `${u.protocol}//${u.host}/health`
  } catch {
    return 'http://127.0.0.1:4001/health'
  }
}

/**
 * Garde-fou : le runner UC est mutatif. Il refuse toute API qui n’a pas
 * e2eDb=true (démarrée via start:e2e / test:use-cases:e2e).
 *
 * Contournement volontaire (rare) : TIMEGATE_UC_ALLOW_ANY_API=1
 */
export async function assertUcMutationsAllowed() {
  if (process.env.TIMEGATE_UC_ALLOW_ANY_API === '1') {
    console.warn(
      '[uc-safety] TIMEGATE_UC_ALLOW_ANY_API=1 — mutations autorisées sans garde E2E.',
    )
    return
  }

  const healthUrl = healthUrlFromApiBase(BASE)
  let health = null
  try {
    const res = await fetch(healthUrl, {
      headers: { Accept: 'application/json' },
    })
    health = await res.json()
  } catch (err) {
    console.error(`[uc-safety] Impossible de joindre ${healthUrl}`)
    console.error(err?.message ?? err)
    process.exit(1)
  }

  if (health?.e2eDb === true) {
    console.log(
      `[uc-safety] OK — API E2E (dbHost=${health.dbHost ?? '?'})`,
    )
    return
  }

  console.error(`
Refus : l’API ciblée n’est pas en mode E2E (health.e2eDb !== true).

Cause fréquente : bun run start:dev avec DATABASE_URL preprod/AlwaysData,
puis bun run test:use-cases qui écrit dans cette base.

Faire plutôt :
  bun run test:use-cases:e2e
ou :
  bun run start:e2e          # terminal 1
  bun run test:use-cases     # terminal 2

API : ${BASE}
Health : ${healthUrl}
dbHost rapporté : ${health?.dbHost ?? '(inconnu)'}
e2eDb : ${health?.e2eDb ?? false}
`)
  process.exit(1)
}
