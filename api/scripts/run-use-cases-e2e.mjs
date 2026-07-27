/**
 * Prépare le Postgres E2E (generate + migrate + seed), démarre l'API dessus,
 * lance test:use-cases, stoppe.
 * Ne touche jamais DATABASE_URL AlwaysData — uniquement E2E_DATABASE_URL.
 */
import { spawn } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { e2eEnv, requireE2eDatabaseUrl, runWithE2eDb } from './with-e2e-db.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiRoot = resolve(__dirname, '..')
const PORT = process.env.E2E_API_PORT || process.env.PORT || '4001'
const BASE = process.env.TIMEGATE_API_URL ?? `http://127.0.0.1:${PORT}/api/v1`

requireE2eDatabaseUrl()

async function waitForApi(maxMs = 90_000) {
  const started = Date.now()
  while (Date.now() - started < maxMs) {
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: 'x', password: 'x' }),
      })
      if (res.status > 0) return true
    } catch {
      // not ready
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

function startApi() {
  const env = e2eEnv({ PORT, TIMEGATE_WAIT_API: '0' })
  console.log(`[e2e-db] Démarrage API sur :${PORT} (E2E_DATABASE_URL)`)
  return spawn('bun', ['run', 'start:dev'], {
    cwd: apiRoot,
    env,
    stdio: 'inherit',
    shell: true,
  })
}

let generate = await runWithE2eDb(['bunx', 'prisma', 'generate'])
if (generate !== 0) process.exit(generate)

let migrate = await runWithE2eDb(['bunx', 'prisma', 'migrate', 'deploy'])
if (migrate !== 0) process.exit(migrate)

let seed = await runWithE2eDb(['bunx', 'prisma', 'db', 'seed'])
if (seed !== 0) process.exit(seed)

const api = startApi()
let exitCode = 1
try {
  process.stdout.write('Attente API E2E… ')
  const ready = await waitForApi()
  console.log(ready ? 'OK' : 'TIMEOUT')
  if (!ready) {
    exitCode = 1
  } else {
    exitCode = await runWithE2eDb(['node', 'scripts/test-use-cases.mjs'], {
      env: { TIMEGATE_API_URL: BASE, TIMEGATE_WAIT_API: '0', PORT },
    })
  }
} finally {
  if (api.pid) {
    console.log(`[e2e-db] Arrêt API (pid ${api.pid})`)
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(api.pid), '/T', '/F'], { stdio: 'ignore', shell: true })
      } else {
        process.kill(-api.pid, 'SIGTERM')
      }
    } catch {
      try {
        api.kill('SIGTERM')
      } catch {
        // ignore
      }
    }
  }
}

process.exit(exitCode)
