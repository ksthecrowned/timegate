import { YEAR, authHeader, detail, employeeLogin, fail, pass, request } from '../helpers.mjs'

export async function runUc10(ctx) {
  ctx.tokens.employee = await employeeLogin('patrick.mukendi@sotrafer.cg')
  if (ctx.tokens.employee) pass(ctx, 'UC-10 Login employé')
  else fail(ctx, 'UC-10 Login employé')

  if (!ctx.tokens.employee) return

  const empAuth = authHeader(ctx.tokens.employee)
  const me = await request('/employee/me', { headers: empAuth })
  if (me.res.status === 200 && me.json?.firstName === 'Patrick') pass(ctx, 'UC-10 GET /employee/me')
  else fail(ctx, 'UC-10 /employee/me', detail(me.json))

  const ebal = await request(`/employee/leave-balances?year=${YEAR}`, { headers: empAuth })
  if (ebal.res.status === 200 && ebal.json?.balances?.length) pass(ctx, 'UC-10 Soldes employé')
  else fail(ctx, 'UC-10 leave-balances', String(ebal.res.status))

  const checkins = await request('/employee/checkins?from=2026-01-01&to=2026-06-30&limit=10', {
    headers: empAuth,
  })
  if (checkins.res.status === 200) pass(ctx, 'UC-10 Pointages employé')
  else fail(ctx, 'UC-10 checkins', String(checkins.res.status))

  const leaves = await request('/employee/leaves?limit=10', { headers: empAuth })
  if (leaves.res.status === 200) pass(ctx, 'UC-10 Historique congés employé')
  else fail(ctx, 'UC-10 leaves list', String(leaves.res.status))

  const ltypes = await request('/employee/leave-types', { headers: empAuth })
  if (ltypes.res.status === 200 && ltypes.json?.data?.length) pass(ctx, 'UC-10 Types congé employé')
  else fail(ctx, 'UC-10 leave-types', String(ltypes.res.status))

  const reqLeave = await request('/employee/leaves', {
    method: 'POST',
    headers: empAuth,
    body: JSON.stringify({
      startDate: '2026-09-10',
      endDate: '2026-09-11',
      reason: `Test UC-10 ${ctx.unique}`,
    }),
  })
  if (reqLeave.json?.status === 'PENDING' || reqLeave.json?.status === 'pending') {
    pass(ctx, 'UC-10 Demande congé PENDING')
  } else {
    fail(ctx, 'UC-10 Demande congé', detail(reqLeave.json))
  }
}
