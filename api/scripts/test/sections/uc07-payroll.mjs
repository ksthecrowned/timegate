import { authHeader, detail, fail, pass, request } from '../helpers.mjs'

async function createFreshPayrollRun(auth) {
  const list = await request('/payroll-runs?page=1&limit=100', { headers: auth })
  const used = new Set((list.json?.data ?? []).map((run) => `${run.year}-${run.month}`))
  const baseYear = Number(process.env.TIMEGATE_TEST_YEAR ?? 2026)

  for (let yearOffset = 0; yearOffset <= 1; yearOffset += 1) {
    const year = baseYear + yearOffset
    for (let month = 1; month <= 12; month += 1) {
      if (!used.has(`${year}-${month}`)) {
        const created = await request('/payroll-runs', {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({ year, month }),
        })
        if (created.json?.id) return created.json
      }
    }
  }

  return null
}

export async function runUc07(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin) {
    fail(ctx, 'UC-07 Prérequis admin token')
    return
  }

  const runs = await request('/payroll-runs?page=1&limit=20', { headers: auth })
  if (runs.res.status === 200 && runs.json?.data?.length) {
    pass(ctx, 'UC-07 Paies liste')
    ctx.ids.payrollRunId = runs.json.data[0].id
  } else {
    fail(ctx, 'UC-07 Paies liste', detail(runs.json))
    return
  }

  const runId = ctx.ids.payrollRunId
  const runDetail = await request(`/payroll-runs/${runId}`, { headers: auth })
  if (runDetail.res.status === 200) pass(ctx, 'UC-07 Fiche paie')
  else fail(ctx, 'UC-07 Fiche paie', String(runDetail.res.status))

  const lines = await request(`/payroll-runs/${runId}/lines`, { headers: auth })
  if (lines.res.status === 200) pass(ctx, 'UC-07 Lignes de paie')
  else fail(ctx, 'UC-07 Lignes de paie', String(lines.res.status))

  const exportRes = await request(`/payroll-runs/${runId}/export`, { headers: auth })
  if (exportRes.json?.csv || exportRes.json?.filename) pass(ctx, 'UC-07 Export CSV paie')
  else fail(ctx, 'UC-07 Export CSV paie', detail(exportRes.json))

  const grid = await request('/compensation-grid?page=1&limit=20', { headers: auth })
  if (grid.res.status === 200) pass(ctx, 'UC-07 Grille salariale liste')
  else fail(ctx, 'UC-07 Grille salariale liste', String(grid.res.status))

  const employeeId = ctx.ids.patrickId
  if (!employeeId) {
    fail(ctx, 'UC-07 Prérequis employé', 'UC-03 n’a fourni aucun employé')
    return
  }

  const payGroup = await request('/pay-groups', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ name: `UC-07 Groupe ${ctx.unique}`, payDayOfMonth: 12 }),
  })
  if (!payGroup.json?.id) {
    fail(ctx, 'UC-07 Groupe de paie création', detail(payGroup.json))
    return
  }
  pass(ctx, 'UC-07 Groupe de paie création')

  const employee = await request(`/employees/${employeeId}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ payGroupId: payGroup.json.id, payDueDayOverride: 17 }),
  })
  if (employee.res.status !== 200) {
    fail(ctx, 'UC-07 Affecter groupe et échéance employé', detail(employee.json))
    return
  }
  pass(ctx, 'UC-07 Affecter groupe et échéance employé')

  const draftRun = await createFreshPayrollRun(auth)
  if (!draftRun?.id) {
    fail(ctx, 'UC-07 Paie brouillon créée', 'aucun mois disponible')
    return
  }
  pass(ctx, 'UC-07 Paie brouillon créée')

  const locked = await request(`/payroll-runs/${draftRun.id}/lock`, {
    method: 'PATCH',
    headers: auth,
  })
  if (locked.res.status !== 200) {
    fail(ctx, 'UC-07 Lock payroll', detail(locked.json))
    return
  }
  pass(ctx, 'UC-07 Verrouiller paie brouillon')

  const totals = locked.json?.totals
  if (
    totals &&
    ['baseSalary', 'gross', 'net'].every((key) => Number.isFinite(totals[key]))
  ) {
    pass(ctx, 'UC-07 Totaux de masse présents')
  } else {
    fail(ctx, 'UC-07 Totaux de masse présents', detail(locked.json))
  }

  const lockedLines = await request(`/payroll-runs/${draftRun.id}/lines`, { headers: auth })
  const employeeLine = lockedLines.json?.find((line) => line.employeeId === employeeId)
  const lineToPay = lockedLines.json?.find((line) => line.employeeId !== employeeId)
  if (!employeeLine?.dueDate?.startsWith(`${draftRun.year}-${String(draftRun.month).padStart(2, '0')}-17`)) {
    fail(ctx, 'UC-07 Échéance employé override', detail(employeeLine))
    return
  }
  pass(ctx, 'UC-07 Échéance employé override')

  if (!lineToPay?.id) {
    fail(ctx, 'UC-07 Paiement partiel prérequis', 'au moins deux employés actifs requis')
    return
  }

  const partiallyPaid = await request(`/payroll-runs/${draftRun.id}/mark-lines-paid`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ lineIds: [lineToPay.id] }),
  })
  if (
    partiallyPaid.res.status === 201 &&
    partiallyPaid.json?.status === 'PARTIALLY_PAID' &&
    partiallyPaid.json?.paymentProgress?.paidCount === 1
  ) {
    pass(ctx, 'UC-07 Marquer une ligne payée partiellement')
  } else {
    fail(ctx, 'UC-07 Marquer une ligne payée partiellement', detail(partiallyPaid.json))
    return
  }

  const summary = await request(`/payroll-runs/${draftRun.id}/payment-summary-by-branch`, {
    headers: auth,
  })
  const employeeStillUnpaid = summary.json?.some((branch) =>
    branch.unpaidEmployeeIds?.includes(employeeId),
  )
  if (summary.res.status === 200 && employeeStillUnpaid) {
    pass(ctx, 'UC-07 Synthèse branche inclut employé impayé')
  } else {
    fail(ctx, 'UC-07 Synthèse branche inclut employé impayé', detail(summary.json))
  }
}
