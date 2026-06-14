import { authHeader, detail, fail, pass, request } from '../helpers.mjs'

export async function runUc03b(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  const branchId = ctx.ids.branchId
  if (!ctx.tokens.admin || !branchId) {
    fail(ctx, 'UC-03b Prérequis admin + branchId')
    return
  }

  const bulk = await request('/employees/bulk', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      employees: [
        {
          firstName: 'TestUC',
          lastName: 'Import1',
          branchId,
          email: `test.uc.${ctx.unique}@example.com`,
        },
        { firstName: 'Bad', lastName: 'Row' },
      ],
    }),
  })
  if (bulk.json?.created === 1 && bulk.json?.failed === 1) {
    pass(ctx, 'UC-03b Import partial success (1 créé, 1 erreur)')
  } else {
    fail(ctx, 'UC-03b Import partial success', detail(bulk.json))
  }

  const bulkDup = await request('/employees/bulk', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      employees: [
        { firstName: 'Dup', lastName: 'A', branchId, email: `dup.a.${ctx.unique}@test.com` },
        { firstName: 'Dup', lastName: 'B', branchId, email: `dup.a.${ctx.unique}@test.com` },
      ],
    }),
  })
  if ((bulkDup.json?.failed ?? 0) >= 1) pass(ctx, 'UC-03b Doublon email dans fichier')
  else fail(ctx, 'UC-03b Doublon email', detail(bulkDup.json))
}
