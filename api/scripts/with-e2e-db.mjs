import { config } from 'dotenv'
import { spawn } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiRoot = resolve(__dirname, '..')

config({ path: resolve(apiRoot, '.env') })

/**
 * Local-only Postgres hosts allowed for E2E_DATABASE_URL.
 * Refuses AlwaysData / Render / Railway / any remote cloud DB.
 */
const LOCAL_HOST_RE =
  /^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/i

function parsePgHost(connectionString) {
  try {
    const u = new URL(connectionString)
    return u.hostname || null
  } catch {
    const m = /@([^/:?]+)(?::\d+)?\//.exec(connectionString)
    return m?.[1] ?? null
  }
}

export function isLocalPostgresUrl(connectionString) {
  const host = parsePgHost(connectionString)
  if (!host) return false
  if (LOCAL_HOST_RE.test(host)) return true
  // Docker Desktop / WSL aliases sometimes used locally
  if (/^(host\.docker\.internal|postgres|db)$/i.test(host)) return true
  return false
}

/**
 * Force DATABASE_URL = E2E_DATABASE_URL for child commands
 * (migrate / seed / API) so AlwaysData / preprod n'est jamais touché.
 */
export function requireE2eDatabaseUrl() {
  const e2e = process.env.E2E_DATABASE_URL?.trim()
  if (!e2e) {
    console.error('E2E_DATABASE_URL manquant dans api/.env')
    process.exit(1)
  }
  if (/alwaysdata\.net/i.test(e2e) || !isLocalPostgresUrl(e2e)) {
    const host = parsePgHost(e2e) ?? '(inconnu)'
    console.error(
      `Refus : E2E_DATABASE_URL doit être un Postgres local (host=${host}).`,
    )
    console.error(
      'Ex. postgresql://postgres:***@localhost:5432/timegate_db — jamais AlwaysData / preprod.',
    )
    process.exit(1)
  }
  return e2e
}

export function e2eEnv(extra = {}) {
  const e2e = requireE2eDatabaseUrl()
  return {
    ...process.env,
    DATABASE_URL: e2e,
    /** Autorise le runner mutatif test:use-cases (voir assertUcMutationsAllowed). */
    TIMEGATE_UC_MUTATIONS_OK: '1',
    TIMEGATE_E2E_DB: '1',
    ...extra,
  }
}

export function runWithE2eDb(commandArgs, options = {}) {
  const env = e2eEnv(options.env)
  const [cmd, ...args] = commandArgs
  if (!cmd) {
    console.error('Usage: node scripts/with-e2e-db.mjs <commande> [args…]')
    process.exit(1)
  }
  console.log(`[e2e-db] DATABASE_URL ← E2E_DATABASE_URL | ${cmd} ${args.join(' ')}`)
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd ?? apiRoot,
      env,
      stdio: 'inherit',
      shell: true,
    })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (signal) reject(new Error(`Signal ${signal}`))
      else resolvePromise(code ?? 1)
    })
  })
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const code = await runWithE2eDb(process.argv.slice(2))
  process.exit(code)
}
