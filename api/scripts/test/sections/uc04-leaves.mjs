import { YEAR, authHeader, detail, fail, pass, request } from '../helpers.mjs'

export async function runUc04(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  const patrickId = ctx.ids.patrickId
  if (!ctx.tokens.admin || !patrickId) {
    fail(ctx, 'UC-04 Prérequis admin + patrickId')
    return
  }

  const leaves = await request('/leaves?page=1&limit=20', { headers: auth })
  if (leaves.res.status === 200) pass(ctx, 'UC-04 Congés liste')
  else fail(ctx, 'UC-04 Congés liste', String(leaves.res.status))

  const absences = await request('/absences?page=1&limit=20', { headers: auth })
  if (absences.res.status === 200) pass(ctx, 'UC-04 Absences liste')
  else fail(ctx, 'UC-04 Absences liste', String(absences.res.status))

  const lates = await request('/late-records?page=1&limit=20', { headers: auth })
  if (lates.res.status === 200) pass(ctx, 'UC-04 Retards liste')
  else fail(ctx, 'UC-04 Retards liste', String(lates.res.status))

  const leaveTypes = await request('/leave-types?page=1&limit=20', { headers: auth })
  const annual = leaveTypes.json?.data?.find(
    (t) => t.leaveTypeName === 'Annual Leave' || t.name === 'Annual Leave',
  )
  if (annual?.maxDaysPerYear === 22) pass(ctx, 'UC-04 Annual Leave 22 j/an')
  else fail(ctx, 'UC-04 Annual Leave 22 j/an', detail(annual))

  const balances = await request(`/employees/${patrickId}/leave-balances?year=${YEAR}`, {
    headers: auth,
  })
  if (balances.json?.balances?.length && balances.json.balances[0].remaining != null) {
    pass(ctx, 'UC-04 Soldes congés manager')
  } else fail(ctx, 'UC-04 Soldes congés', detail(balances.json))

  const leaveTypeId = annual?.id ?? leaveTypes.json?.data?.[0]?.id
  const createLeave = await request('/leaves', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      employeeId: patrickId,
      leaveTypeId,
      startDate: '2026-12-01',
      endDate: '2026-12-31',
      status: 'PENDING',
    }),
  })
  const leaveId = createLeave.json?.id
  if (leaveId) {
    ctx.ids.testLeaveId = leaveId
    const approve = await request(`/leaves/${leaveId}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ status: 'APPROVED' }),
    })
    const msg = JSON.stringify(approve.json)
    if (approve.res.status === 400 && /solde/i.test(msg)) {
      pass(ctx, 'UC-04c Approbation au-delà du solde refusée')
    } else if (approve.res.status === 400) {
      pass(ctx, 'UC-04c Approbation refusée (400)')
    } else {
      fail(ctx, 'UC-04c Approbation solde', `${approve.res.status} ${msg}`)
    }
  } else {
    fail(ctx, 'UC-04c Création congé test', detail(createLeave.json))
  }
}
