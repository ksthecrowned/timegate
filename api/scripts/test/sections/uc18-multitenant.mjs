import { authHeader, detail, fail, pass, request } from '../helpers.mjs'

export async function runUc18(ctx) {
  if (!ctx.tokens.admin || !ctx.ids.patrickId) {
    fail(ctx, 'UC-18 Prérequis admin + patrickId')
    return
  }

  const signupA = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      organizationName: `Tenant A ${ctx.unique}`,
      organizationSize: '1-10',
      adminEmail: `admin.a.${ctx.unique}@tenant-test.example`,
      adminPassword: 'ChangeMe123!',
      adminFirstName: 'Admin',
      adminLastName: 'Alpha',
      contactRole: 'hr',
    }),
  })
  const tokenA = signupA.json?.access_token
  if (tokenA && signupA.json?.organization?.id) {
    pass(ctx, 'UC-18 Signup tenant A')
    ctx.tokens.tenantA = tokenA
    ctx.ids.tenantAOrgId = signupA.json.organization.id
  } else {
    fail(ctx, 'UC-18 Signup tenant A', detail(signupA.json))
    return
  }

  const signupB = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      organizationName: `Tenant B ${ctx.unique}`,
      organizationSize: '11-50',
      adminEmail: `admin.b.${ctx.unique}@tenant-test.example`,
      adminPassword: 'ChangeMe123!',
      adminFirstName: 'Admin',
      adminLastName: 'Beta',
      contactRole: 'founder',
    }),
  })
  const tokenB = signupB.json?.access_token
  if (tokenB) {
    pass(ctx, 'UC-18 Signup tenant B')
    ctx.tokens.tenantB = tokenB
  } else {
    fail(ctx, 'UC-18 Signup tenant B', detail(signupB.json))
  }

  const authA = authHeader(tokenA)
  const idorGet = await request(`/employees/${ctx.ids.patrickId}`, { headers: authA })
  if (idorGet.res.status === 403) pass(ctx, 'UC-18 IDOR GET employé autre tenant → 403')
  else fail(ctx, 'UC-18 IDOR GET', String(idorGet.res.status))

  const idorPatch = await request(`/employees/${ctx.ids.patrickId}`, {
    method: 'PATCH',
    headers: authA,
    body: JSON.stringify({ firstName: 'Hacked' }),
  })
  if (idorPatch.res.status === 403) pass(ctx, 'UC-18 IDOR PATCH employé → 403')
  else fail(ctx, 'UC-18 IDOR PATCH', String(idorPatch.res.status))

  const idorBadge = await request(`/employees/${ctx.ids.patrickId}/nfc-badge`, {
    method: 'PATCH',
    headers: authA,
    body: JSON.stringify({ badgeUid: 'HACKBADGE9999' }),
  })
  if (idorBadge.res.status === 403) pass(ctx, 'UC-18 IDOR NFC badge → 403')
  else fail(ctx, 'UC-18 IDOR NFC', String(idorBadge.res.status))

  const listA = await request('/employees?page=1&limit=50', { headers: authA })
  const leaked = (listA.json?.data ?? []).some((e) => e.id === ctx.ids.patrickId)
  if (listA.res.status === 200 && !leaked) pass(ctx, 'UC-18 Liste A sans employé SOTR')
  else fail(ctx, 'UC-18 Isolation liste employés', detail({ status: listA.res.status, leaked }))

  if (ctx.ids.kioskId) {
    const idorKiosk = await request(`/kiosks/${ctx.ids.kioskId}`, { headers: authA })
    if (idorKiosk.res.status === 403 || idorKiosk.res.status === 404) {
      pass(ctx, `UC-18 IDOR kiosk SOTR → ${idorKiosk.res.status}`)
    } else {
      fail(ctx, 'UC-18 IDOR kiosk', String(idorKiosk.res.status))
    }
  }

  const sotrPatrick = await request(`/employees/${ctx.ids.patrickId}`, {
    headers: authHeader(ctx.tokens.admin),
  })
  if (sotrPatrick.res.status === 200 && sotrPatrick.json?.id === ctx.ids.patrickId) {
    pass(ctx, 'UC-18 Tenant SOTR intact')
  } else {
    fail(ctx, 'UC-18 Tenant SOTR', detail(sotrPatrick.json))
  }

  if (tokenB) {
    const crossLeave = await request('/leaves?page=1&limit=5', {
      headers: authHeader(tokenB),
    })
    if (crossLeave.res.status === 200) {
      const foreign = (crossLeave.json?.data ?? []).some(
        (l) => l.employeeId === ctx.ids.patrickId,
      )
      if (!foreign) pass(ctx, 'UC-18 Congés B sans données SOTR')
      else fail(ctx, 'UC-18 Fuite congés cross-tenant')
    } else {
      fail(ctx, 'UC-18 Liste congés B', String(crossLeave.res.status))
    }
  }

  const dupSignup = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      organizationName: `Dup ${ctx.unique}`,
      organizationSize: '1-10',
      adminEmail: `admin.a.${ctx.unique}@tenant-test.example`,
      adminPassword: 'ChangeMe123!',
      adminFirstName: 'Dup',
      adminLastName: 'User',
      contactRole: 'other',
    }),
  })
  if (dupSignup.res.status === 409 || dupSignup.res.status === 400) {
    pass(ctx, 'UC-18 Signup e-mail déjà pris')
  } else {
    fail(ctx, 'UC-18 Signup dupliqué', String(dupSignup.res.status))
  }
}
