import { authHeader, detail, ensureDraftPayrollRun, fail, pass, request } from '../helpers.mjs'

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
  if (grid.res.status === 200) pass(ctx, 'UC-07 Grille de rémunération liste')
  else fail(ctx, 'UC-07 Grille de rémunération liste', String(grid.res.status))

  const draftRun = await ensureDraftPayrollRun(ctx, auth, 'UC-07 Paie brouillon créée')
  if (!draftRun?.id) {
    fail(ctx, 'UC-07 Paie brouillon pour lock', 'aucun mois disponible')
    return
  }

  const locked = await request(`/payroll-runs/${draftRun.id}/lock`, {
    method: 'PATCH',
    headers: auth,
  })
  if (locked.res.status === 200) {
    pass(ctx, 'UC-07 Verrouiller paie brouillon')
    const paid = await request(`/payroll-runs/${draftRun.id}/mark-paid`, {
      method: 'PATCH',
      headers: auth,
    })
    if (paid.res.status === 200) pass(ctx, 'UC-07 Marquer paie payée')
    else fail(ctx, 'UC-07 Mark paid', detail(paid.json))
  } else {
    fail(ctx, 'UC-07 Lock payroll', detail(locked.json))
  }
}
