import { config } from 'dotenv'
import { spawn } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiRoot = resolve(__dirname, '..')

config({ path: resolve(apiRoot, '.env') })

/**
 * Force DATABASE_URL = E2E_DATABASE_URL for child commands
 * (migrate / seed / API) so AlwaysData n'est jamais touché par accident.
 */
export function requireE2eDatabaseUrl() {
  const e2e = process.env.E2E_DATABASE_URL?.trim()
  if (!e2e) {
    console.error('E2E_DATABASE_URL manquant dans api/.env')
    process.exit(1)
  }
  if (/alwaysdata\.net/i.test(e2e)) {
    console.error('Refus : E2E_DATABASE_URL pointe vers AlwaysData — utilise un Postgres local.')
    process.exit(1)
  }
  return e2e
}

export function e2eEnv(extra = {}) {
  const e2e = requireE2eDatabaseUrl()
  return {
    ...process.env,
    DATABASE_URL: e2e,
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
