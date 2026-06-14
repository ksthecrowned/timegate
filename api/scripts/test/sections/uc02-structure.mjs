import { authHeader, detail, fail, pass, request } from '../helpers.mjs'

export async function runUc02(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin) {
    fail(ctx, 'UC-02 Prérequis admin token')
    return
  }

  const branches = await request('/branches?page=1&limit=10', { headers: auth })
  const branchId = branches.json?.data?.[0]?.id
  if (branchId) {
    pass(ctx, 'UC-02 Branches liste')
    ctx.ids.branchId = branchId
  } else fail(ctx, 'UC-02 Branches liste')

  const newBranch = await request('/branches', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ name: `Site Test ${ctx.unique}`, timezone: 'Africa/Brazzaville' }),
  })
  if (newBranch.json?.id) {
    pass(ctx, 'UC-02 Branche création')
    ctx.ids.testBranchId = newBranch.json.id
    const updated = await request(`/branches/${newBranch.json.id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ name: `Site Test ${ctx.unique} Updated` }),
    })
    if (updated.res.status === 200) pass(ctx, 'UC-02 Branche mise à jour')
    else fail(ctx, 'UC-02 Branche PATCH', String(updated.res.status))
  } else {
    fail(ctx, 'UC-02 Branche création', detail(newBranch.json))
  }

  const dept = await request('/departments', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ name: `Finance ${ctx.unique}`, code: `FIN${ctx.unique}` }),
  })
  if (dept.json?.id) {
    pass(ctx, 'UC-02 Département CRUD create')
    ctx.ids.departmentId = dept.json.id
  } else fail(ctx, 'UC-02 Département create', detail(dept.json))

  const desig = await request('/designations', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ name: `Analyste ${ctx.unique}` }),
  })
  if (desig.json?.id) {
    pass(ctx, 'UC-02 Poste create')
    ctx.ids.designationId = desig.json.id
  } else fail(ctx, 'UC-02 Poste create', detail(desig.json))

  const schedules = await request('/shift-types?page=1&limit=10', { headers: auth })
  const scheduleId = schedules.json?.data?.[0]?.id
  if (scheduleId) {
    pass(ctx, 'UC-02 Horaires liste')
    ctx.ids.scheduleId = scheduleId
  } else fail(ctx, 'UC-02 Horaires liste')

  const workDays = await request(`/work-days?page=1&limit=10&scheduleId=${scheduleId ?? ''}`, {
    headers: auth,
  })
  if (workDays.res.status === 200) pass(ctx, 'UC-02 Jours ouvrés liste')
  else fail(ctx, 'UC-02 Jours ouvrés', String(workDays.res.status))

  const locations = await request('/shift-locations?page=1&limit=10', { headers: auth })
  if (locations.res.status === 200) pass(ctx, 'UC-02 Lieux horaire liste')
  else fail(ctx, 'UC-02 Lieux horaire', String(locations.res.status))

  const employees = await request('/employees?page=1&limit=5', { headers: auth })
  const employeeId = employees.json?.data?.[0]?.id
  if (employeeId && scheduleId) {
    const assign = await request('/shift-assignments', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        employeeId,
        shiftTypeId: scheduleId,
        startDate: '2026-01-01',
      }),
    })
    if (assign.json?.id) pass(ctx, 'UC-02 Affectation horaire create')
    else fail(ctx, 'UC-02 Affectation create', detail(assign.json))
  } else {
    fail(ctx, 'UC-02 Affectation prérequis', 'employee/schedule manquant')
  }
}
