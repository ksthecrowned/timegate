#!/usr/bin/env node
/**
 * @deprecated Utiliser scripts/test-use-cases.mjs
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const result = spawnSync(process.execPath, [join(dir, 'test-use-cases.mjs'), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
})
process.exit(result.status ?? 1)
