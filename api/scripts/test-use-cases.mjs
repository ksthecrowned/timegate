import { createContext, summarize, waitForApi } from './test/helpers.mjs'
import { runUc01 } from './test/sections/uc01-auth.mjs'
import { runUc02 } from './test/sections/uc02-structure.mjs'
import { runUc03 } from './test/sections/uc03-employees.mjs'
import { runUc03b } from './test/sections/uc03b-import.mjs'
import { runUc04 } from './test/sections/uc04-leaves.mjs'
import { runUc05 } from './test/sections/uc05-attendance.mjs'
import { runUc06 } from './test/sections/uc06-timesheets.mjs'
import { runUc07 } from './test/sections/uc07-payroll.mjs'
import { runUc08 } from './test/sections/uc08-saas.mjs'
import { runUc09 } from './test/sections/uc09-superadmin.mjs'
import { runUc10 } from './test/sections/uc10-employee.mjs'
import { runUc11 } from './test/sections/uc11-sequential.mjs'
import { runUc12 } from './test/sections/uc12-e2e.mjs'
import { runUc13 } from './test/sections/uc13-planning-kpi.mjs'

const sections = [
  { name: 'UC-01 Auth & rôles', run: runUc01 },
  { name: 'UC-02 Structure', run: runUc02 },
  { name: 'UC-03 Employés', run: runUc03 },
  { name: 'UC-03b Import CSV', run: runUc03b },
  { name: 'UC-04 Congés', run: runUc04 },
  { name: 'UC-05 Présence', run: runUc05 },
  { name: 'UC-06 Timesheets', run: runUc06 },
  { name: 'UC-07 Paie', run: runUc07 },
  { name: 'UC-08 SaaS', run: runUc08 },
  { name: 'UC-09 Super admin', run: runUc09 },
  { name: 'UC-10 Portail employé', run: runUc10 },
  { name: 'UC-11 Séquentiel', run: runUc11 },
  { name: 'UC-12 Bout-en-bout', run: runUc12 },
  { name: 'UC-13 Planning vs actual', run: runUc13 },
]

async function main() {
  if (process.env.TIMEGATE_WAIT_API !== '0') {
    process.stdout.write('Attente API… ')
    const ready = await waitForApi()
    console.log(ready ? 'OK' : 'TIMEOUT')
    if (!ready) process.exit(1)
  }

  const ctx = createContext()
  console.log('TimeGate — tests use-cases API\n')

  for (const section of sections) {
    console.log(`\n--- ${section.name} ---`)
    await section.run(ctx)
  }

  process.exit(summarize(ctx))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
