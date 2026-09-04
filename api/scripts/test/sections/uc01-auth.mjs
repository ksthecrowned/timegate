import { authHeader, detail, fail, login, pass, request, PASS as DEFAULT_PASSWORD } from '../helpers.mjs'

export async function runUc01(ctx) {
  ctx.tokens.admin = await login('admin@sotrafer.cg', { sku: 'SOTR' })
  if (ctx.tokens.admin) pass(ctx, 'UC-01 Admin login')
  else fail(ctx, 'UC-01 Admin login')

  ctx.tokens.manager = await login('manager@sotrafer.cg', { sku: 'SOTR' })
  if (ctx.tokens.manager) pass(ctx, 'UC-01 Manager login')
  else fail(ctx, 'UC-01 Manager login')

  ctx.tokens.superAdmin = await login('superadmin@timegate.com')
  if (ctx.tokens.superAdmin) pass(ctx, 'UC-01 Super admin login')
  else fail(ctx, 'UC-01 Super admin login')

  const badLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@sotrafer.cg',
      password: 'wrong',
      sku: 'SOTR',
    }),
  })
  if (badLogin.res.status === 401 || badLogin.res.status === 400) {
    pass(ctx, `UC-01 Mauvais mot de passe (${badLogin.res.status})`)
  } else {
    fail(ctx, 'UC-01 Mauvais mot de passe', String(badLogin.res.status))
  }

  if (ctx.tokens.manager) {
    const denied = await request('/payroll-runs', {
      method: 'POST',
      headers: authHeader(ctx.tokens.manager),
      body: JSON.stringify({ year: 2026, month: 6 }),
    })
    if (denied.res.status === 403) pass(ctx, 'UC-01 Manager refusé POST /payroll-runs')
    else fail(ctx, 'UC-01 Manager POST payroll', String(denied.res.status))
  }

  if (ctx.tokens.superAdmin) {
    const opsDenied = await request('/employees?page=1&limit=5', {
      headers: authHeader(ctx.tokens.superAdmin),
    })
    if (opsDenied.res.status === 403) pass(ctx, 'UC-01 Super admin bloqué sur /employees')
    else fail(ctx, 'UC-01 Super admin /employees', String(opsDenied.res.status))

    const orgs = await request('/auth/super-admin/organizations', {
      headers: authHeader(ctx.tokens.superAdmin),
    })
    if (orgs.res.status === 200 && Array.isArray(orgs.json)) {
      pass(ctx, 'UC-09 Organisations super admin')
      if (orgs.json.length > 0) ctx.ids.platformOrg = orgs.json[0].id
    } else {
      fail(ctx, 'UC-09 Organisations super admin', JSON.stringify(orgs.json))
    }
  }

  if (ctx.tokens.superAdmin) {
    const countries = await request('/countries?page=1&limit=20', {
      headers: authHeader(ctx.tokens.superAdmin),
    })
    if (countries.res.status === 200) pass(ctx, 'UC-01 Pays liste')
    else fail(ctx, 'UC-01 Pays liste', String(countries.res.status))

    const code = `T${String(ctx.unique).slice(-6)}`
    const created = await request('/countries', {
      method: 'POST',
      headers: authHeader(ctx.tokens.superAdmin),
      body: JSON.stringify({ name: `Test Country ${ctx.unique}`, isoCode: code }),
    })
    if (created.res.status === 201 || created.json?.id) {
      pass(ctx, 'UC-01 Pays création')
      const countryId = created.json?.id
      if (countryId) {
        const city = await request('/cities', {
          method: 'POST',
          headers: authHeader(ctx.tokens.superAdmin),
          body: JSON.stringify({
            name: `Test City ${ctx.unique}`,
            countryId,
          }),
        })
        if (city.res.status === 201 || city.json?.id) {
          pass(ctx, 'UC-01 Ville création')
          const cityId = city.json.id
          const deletedCity = await request(`/cities/${cityId}`, {
            method: 'DELETE',
            headers: authHeader(ctx.tokens.superAdmin),
          })
          if (deletedCity.res.status === 200) pass(ctx, 'UC-01 Ville suppression')
          else fail(ctx, 'UC-01 Ville suppression', JSON.stringify(deletedCity.json))
        } else {
          fail(ctx, 'UC-01 Ville création', JSON.stringify(city.json))
        }

        const deletedCountry = await request(`/countries/${countryId}`, {
          method: 'DELETE',
          headers: authHeader(ctx.tokens.superAdmin),
        })
        if (deletedCountry.res.status === 200) pass(ctx, 'UC-01 Pays suppression')
        else fail(ctx, 'UC-01 Pays suppression', JSON.stringify(deletedCountry.json))
      }
    } else {
      fail(ctx, 'UC-01 Pays création', JSON.stringify(created.json))
    }
  }

  if (ctx.tokens.admin) {
    const me = await request('/auth/me', { headers: authHeader(ctx.tokens.admin) })
    if (me.res.status === 200 && me.json?.email) pass(ctx, 'UC-01 GET /auth/me enrichi')
    else fail(ctx, 'UC-01 GET /auth/me', detail(me.json))

    const patch = await request('/auth/me', {
      method: 'PATCH',
      headers: authHeader(ctx.tokens.admin),
      body: JSON.stringify({ firstName: 'Admin', lastName: 'Test' }),
    })
    if (patch.res.status === 200 && patch.json?.firstName === 'Admin') pass(ctx, 'UC-01 PATCH /auth/me')
    else fail(ctx, 'UC-01 PATCH /auth/me', detail(patch.json))

    const NEW_ADMIN_PASS = `NewPass${ctx.unique}!`
    const change = await request('/auth/me/password', {
      method: 'PATCH',
      headers: authHeader(ctx.tokens.admin),
      body: JSON.stringify({ currentPassword: DEFAULT_PASSWORD, newPassword: NEW_ADMIN_PASS }),
    })
    if (change.res.status === 200 && change.json?.ok) pass(ctx, 'UC-01 Change password admin')
    else fail(ctx, 'UC-01 Change password admin', detail(change.json))

    const relogin = await login('admin@sotrafer.cg', { sku: 'SOTR', password: NEW_ADMIN_PASS })
    if (relogin) {
      pass(ctx, 'UC-01 Re-login admin nouveau MDP')
      ctx.tokens.admin = relogin
    } else fail(ctx, 'UC-01 Re-login admin')

    await request('/auth/me/password', {
      method: 'PATCH',
      headers: authHeader(ctx.tokens.admin),
      body: JSON.stringify({ currentPassword: NEW_ADMIN_PASS, newPassword: DEFAULT_PASSWORD }),
    })

    const badCurrent = await request('/auth/me/password', {
      method: 'PATCH',
      headers: authHeader(ctx.tokens.admin),
      body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'AnotherPass1!' }),
    })
    if (badCurrent.res.status === 401) pass(ctx, 'UC-01 Change password mauvais actuel')
    else fail(ctx, 'UC-01 Change password mauvais actuel', String(badCurrent.res.status))

    const short = await request('/auth/me/password', {
      method: 'PATCH',
      headers: authHeader(ctx.tokens.admin),
      body: JSON.stringify({ currentPassword: DEFAULT_PASSWORD, newPassword: 'short' }),
    })
    if (short.res.status === 400) pass(ctx, 'UC-01 Change password trop court')
    else fail(ctx, 'UC-01 Change password trop court', String(short.res.status))
  }
}
