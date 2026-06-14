import { authHeader, detail, fail, pass, request } from '../helpers.mjs'

export async function runUc03(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin) {
    fail(ctx, 'UC-03 Prérequis admin token')
    return
  }

  const employees = await request('/employees?page=1&limit=30', { headers: auth })
  const patrick =
    employees.json?.data?.find((e) => e.firstName === 'Patrick') ?? employees.json?.data?.[0]
  if (patrick?.id) {
    pass(ctx, 'UC-03 Employés liste')
    ctx.ids.patrickId = patrick.id
  } else fail(ctx, 'UC-03 Employés liste')

  if (patrick?.id) {
    const detailRes = await request(`/employees/${patrick.id}`, { headers: auth })
    if (detailRes.res.status === 200 && detailRes.json?.id) pass(ctx, 'UC-03 Fiche employé')
    else fail(ctx, 'UC-03 Fiche employé', String(detailRes.res.status))

    const contracts = await request(`/employees/contracts?employeeId=${patrick.id}`, {
      headers: auth,
    })
    if (contracts.res.status === 200) {
      pass(ctx, 'UC-03 Contrats employé liste')
      if (contracts.json?.data?.length) ctx.ids.contractId = contracts.json.data[0].id
    } else fail(ctx, 'UC-03 Contrats liste', String(contracts.res.status))
  }
}
