import { authHeader, fail, login, pass, request } from '../helpers.mjs'

export async function runUc01(ctx) {
  ctx.tokens.admin = await login('admin@monorganisation.com', { sku: 'SOTR' })
  if (ctx.tokens.admin) pass(ctx, 'UC-01 Admin login')
  else fail(ctx, 'UC-01 Admin login')

  ctx.tokens.manager = await login('manager@monorganisation.com', { sku: 'SOTR' })
  if (ctx.tokens.manager) pass(ctx, 'UC-01 Manager login')
  else fail(ctx, 'UC-01 Manager login')

  ctx.tokens.superAdmin = await login('superadmin@monorganisation.com')
  if (ctx.tokens.superAdmin) pass(ctx, 'UC-01 Super admin login')
  else fail(ctx, 'UC-01 Super admin login')

  const badLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@monorganisation.com',
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
}
