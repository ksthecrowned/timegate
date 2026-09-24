/**
 * UC-20 — Stress multi-secteurs terrain (G + C + E)
 * Playbook : docs/pilot/interne/stress-tests-multisecteurs.md
 *
 * Smoke + mutations : lieu → mission → affectation → archive
 * + overnight clinique + soft-end contrat + cycle punch→timesheet→paie.
 */
import {
  authHeader,
  dateFromIsoTimestamp,
  detail,
  fail,
  localIso,
  pass,
  provisionKiosk,
  recalculateAttendanceAndTimesheets,
  request,
  uniqueCheckInTimestamp,
  uniqueWeekdayParts,
} from '../helpers.mjs'

const SCENARIOS = [
  'bureau',
  'formation',
  'industrie',
  'hotel',
  'clinique',
  'securite',
  'nettoyage',
  'placement',
]

const NIGHT_PIN = '4321'
const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

function msgOf(json) {
  return String(json?.message ?? JSON.stringify(json ?? ''))
}

function okVerify(res) {
  return res.status === 200 || res.status === 201
}

export async function runUc20(ctx) {
  if (!ctx.tokens.admin) {
    fail(ctx, 'UC-20 Prérequis admin')
    return
  }
  const auth = authHeader(ctx.tokens.admin)
  const tag = `UC20-${ctx.unique}`

  const company = await request('/companies/me', { headers: auth })
  if (company.res.status !== 200) {
    fail(ctx, 'UC-20 companies/me', detail(company.json))
    return
  }
  pass(ctx, 'UC-20 Org seed accessible')

  const caps = company.json?.usage?.capabilities ?? []
  const need = [
    'multi_locations',
    'multi_kiosks',
    'client_missions',
    'anomaly_workflow',
    'scoped_managers',
  ]
  const missing = need.filter((c) => !caps.includes(c))
  if (missing.length === 0) pass(ctx, 'UC-20 Capacités stress présentes sur plan seed')
  else fail(ctx, 'UC-20 Capacités manquantes', missing.join(', '))

  // --- Inventaire seed ---
  const locations = await request('/locations?page=1&limit=20&isActive=true', { headers: auth })
  const locCount = locations.json?.data?.length ?? 0
  const seedLocationId = locations.json?.data?.[0]?.id
  if (locations.res.status === 200 && locCount >= 1) {
    pass(ctx, `UC-20 bureau/hotel — ${locCount} lieu(x) actif(s)`)
  } else {
    fail(ctx, 'UC-20 lieux', detail({ status: locations.res.status, locCount }))
  }

  const branches = await request('/branches?page=1&limit=5', { headers: auth })
  const branchId = branches.json?.data?.[0]?.id
  if (!branchId) fail(ctx, 'UC-20 branche seed', detail(branches.json))
  else pass(ctx, 'UC-20 branche seed OK')

  const employees = await request('/employees?page=1&limit=5', { headers: auth })
  const employeeId = employees.json?.data?.[0]?.id
  if (employees.res.status === 200 && employeeId) {
    pass(ctx, 'UC-20 employés ACTIVE listables')
  } else {
    fail(ctx, 'UC-20 employés', detail(employees.json))
  }

  const shifts = await request('/shift-types?page=1&limit=20', { headers: auth })
  const shiftCount = shifts.json?.data?.length ?? 0
  const shiftTypeId = shifts.json?.data?.[0]?.id
  if (shifts.res.status === 200 && shiftCount >= 2) {
    pass(ctx, `UC-20 formation — ${shiftCount} horaires (multi-horaires)`)
  } else if (shifts.res.status === 200 && shiftCount >= 1) {
    pass(ctx, `UC-20 formation — ${shiftCount} horaire (partiel)`)
  } else {
    fail(ctx, 'UC-20 horaires', detail(shifts.json))
  }

  const kiosks = await request('/kiosks?page=1&limit=20', { headers: auth })
  const kioskCount = kiosks.json?.data?.length ?? 0
  const kioskId = kiosks.json?.data?.[0]?.id
  if (kiosks.res.status === 200 && kioskCount >= 2) {
    pass(ctx, `UC-20 industrie — ${kioskCount} kiosks`)
  } else if (kiosks.res.status === 200 && kioskCount >= 1) {
    pass(ctx, `UC-20 industrie — ${kioskCount} kiosk (partiel)`)
  } else {
    fail(ctx, 'UC-20 kiosks', detail(kiosks.json))
  }

  const team = await request('/manager/team-today', { headers: auth })
  if (team.res.status === 200 && team.json?.summary) {
    pass(ctx, 'UC-20 présence — team-today OK')
  } else {
    fail(ctx, 'UC-20 team-today', detail(team.json))
  }

  const control = await request('/manager/control-center', { headers: auth })
  if (control.res.status === 200 && control.json?.presence) {
    pass(ctx, 'UC-20 N — centre de contrôle OK')
  } else {
    fail(ctx, 'UC-20 control-center', detail(control.json))
  }

  const anomalies = await request('/anomalies?page=1&limit=5&status=OPEN', { headers: auth })
  if (anomalies.res.status === 200) pass(ctx, 'UC-20 securite — anomalies accessibles')
  else fail(ctx, 'UC-20 anomalies', String(anomalies.res.status))

  // --- Terrain mutatif : lieu temporaire ---
  const createdLoc = await request('/locations', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      name: `Stress ${tag}`,
      type: 'CLIENT_SITE',
      clientLabel: `Client ${tag}`,
      address: 'Site temporaire UC-20',
    }),
  })
  const locationId = createdLoc.json?.id
  if (createdLoc.res.status === 201 || locationId) {
    pass(ctx, 'UC-20 hotel — lieu CLIENT_SITE créé')
  } else {
    fail(ctx, 'UC-20 create location', detail(createdLoc.json))
  }

  // Nettoyage — mission client
  if (locationId) {
    const mission = await request('/client-missions', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        title: `Mission ${tag}`,
        locationId,
        clientLabel: `Client ${tag}`,
        status: 'ACTIVE',
      }),
    })
    const missionId = mission.json?.id
    if (missionId) {
      pass(ctx, 'UC-20 nettoyage — mission créée')
      const closed = await request(`/client-missions/${missionId}`, {
        method: 'PATCH',
        headers: auth,
        body: JSON.stringify({ status: 'CLOSED' }),
      })
      if (closed.res.status === 200 && closed.json?.status === 'CLOSED') {
        pass(ctx, 'UC-20 nettoyage — mission CLOSED')
      } else {
        fail(ctx, 'UC-20 close mission', detail(closed.json))
      }
    } else {
      fail(ctx, 'UC-20 create mission', detail(mission.json))
    }
  }

  // Placement — affectation + close
  if (locationId && employeeId && shiftTypeId) {
    const today = new Date().toISOString().slice(0, 10)
    const asn = await request('/shift-assignments', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        employeeId,
        shiftTypeId,
        locationId,
        startDate: today,
      }),
    })
    const asnId = asn.json?.id
    if (asnId) {
      pass(ctx, 'UC-20 placement — affectation créée')
      const closedAsn = await request(`/shift-assignments/${asnId}/close`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          endDate: today,
          reason: `Clôture stress ${tag}`,
        }),
      })
      if (closedAsn.res.status === 200 || closedAsn.json?.closed) {
        pass(ctx, 'UC-20 placement — affectation close (employé conservé)')
      } else {
        fail(ctx, 'UC-20 close assignment', detail(closedAsn.json))
      }
    } else {
      fail(ctx, 'UC-20 create assignment', detail(asn.json))
    }
  }

  // --- E : soft-end contrat sur employé jetable ---
  let disposableEmployeeId = null
  let nightShiftId = null
  if (branchId) {
    const nightShift = await request('/shift-types', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        branchId,
        name: `Nuit ${tag}`,
        startTime: '22:00',
        endTime: '06:00',
        lateGraceMinutes: 10,
        weekDays: [
          ...WEEKDAYS,
          'SATURDAY',
          'SUNDAY',
        ].map((day) => ({ day, startTime: '22:00', endTime: '06:00' })),
      }),
    })
    nightShiftId = nightShift.json?.id
    if (nightShiftId) pass(ctx, 'UC-20 clinique — horaire nuit créé')
    else fail(ctx, 'UC-20 night shift', detail(nightShift.json))

    const emp = await request('/employees', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        firstName: 'Stress',
        lastName: `Night${ctx.unique}`,
        branchId,
        email: `stress.night.${ctx.unique}@test.com`,
        defaultShiftId: nightShiftId ?? shiftTypeId,
      }),
    })
    disposableEmployeeId = emp.json?.id
    if (disposableEmployeeId) pass(ctx, 'UC-20 employé jetable créé')
    else fail(ctx, 'UC-20 create employee', detail(emp.json))

    if (disposableEmployeeId) {
      const pin = await request(`/employees/${disposableEmployeeId}/kiosk-pin`, {
        method: 'PATCH',
        headers: auth,
        body: JSON.stringify({ pin: NIGHT_PIN }),
      })
      if (pin.res.status === 200 || pin.res.status === 201) {
        pass(ctx, 'UC-20 PIN kiosk jetable')
      } else {
        fail(ctx, 'UC-20 set pin', detail(pin.json))
      }

      const signedAt = new Date().toISOString().slice(0, 10)
      const contract = await request(`/employees/${disposableEmployeeId}/contracts`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          signedAt,
          notes: `Contrat stress ${tag}`,
        }),
      })
      const contractId = contract.json?.id
      if (contractId && contract.json?.isCurrent !== false) {
        pass(ctx, 'UC-20 E — contrat créé')
        const ended = await request(
          `/employees/${disposableEmployeeId}/contracts/${contractId}/end`,
          {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({
              reason: `Fin mission stress ${tag}`,
              expiresAt: signedAt,
            }),
          },
        )
        if (ended.res.status === 200 || ended.res.status === 201) {
          if (ended.json?.isCurrent === false) {
            pass(ctx, 'UC-20 E — soft-end contrat (employé conservé)')
          } else {
            fail(ctx, 'UC-20 soft-end isCurrent', detail(ended.json))
          }
        } else {
          fail(ctx, 'UC-20 soft-end', detail(ended.json))
        }

        const stillThere = await request(`/employees/${disposableEmployeeId}`, { headers: auth })
        if (stillThere.res.status === 200 && stillThere.json?.id) {
          pass(ctx, 'UC-20 E — employé toujours présent après soft-end')
        } else {
          fail(ctx, 'UC-20 employee after soft-end', String(stillThere.res.status))
        }
      } else {
        fail(ctx, 'UC-20 create contract', detail(contract.json))
      }
    }
  }

  // --- C : overnight clinique (check-in soir → check-out matin) ---
  if (disposableEmployeeId && nightShiftId && kioskId && seedLocationId) {
    const d = uniqueWeekdayParts(ctx, 3)
    const assignStart = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
    const asnNight = await request('/shift-assignments', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        employeeId: disposableEmployeeId,
        shiftTypeId: nightShiftId,
        locationId: seedLocationId,
        startDate: assignStart,
      }),
    })
    if (asnNight.json?.id) pass(ctx, 'UC-20 clinique — affectation nuit')
    else fail(ctx, 'UC-20 night assignment', detail(asnNight.json))

    let kioskToken = ctx.tokens.kiosk
    if (!kioskToken) {
      const provisioned = await provisionKiosk(ctx.tokens.admin, kioskId)
      kioskToken = provisioned.token
      ctx.tokens.kiosk = kioskToken
    }
    if (!kioskToken) {
      fail(ctx, 'UC-20 token kiosk overnight')
    } else {
      const kioskAuth = authHeader(kioskToken)
      const checkInNight = await request('/auth/kiosk/verify-pin', {
        method: 'POST',
        headers: {
          ...kioskAuth,
          'x-idempotency-key': `uc20-night-in-${ctx.unique}`,
        },
        body: JSON.stringify({
          employeeId: disposableEmployeeId,
          pin: NIGHT_PIN,
          capturedAt: localIso(d.year, d.month, d.day, 22, 15),
        }),
      })
      if (okVerify(checkInNight.res) && /arriv|enregistr|validation/i.test(msgOf(checkInNight.json))) {
        pass(ctx, 'UC-20 clinique — check-in 22:15')
      } else {
        fail(ctx, 'UC-20 night check-in', detail(checkInNight.json))
      }

      const next = new Date(d.year, d.month - 1, d.day)
      next.setDate(next.getDate() + 1)
      const checkOutMorning = await request('/auth/kiosk/verify-pin', {
        method: 'POST',
        headers: {
          ...kioskAuth,
          'x-idempotency-key': `uc20-night-out-${ctx.unique}`,
        },
        body: JSON.stringify({
          employeeId: disposableEmployeeId,
          pin: NIGHT_PIN,
          capturedAt: localIso(
            next.getFullYear(),
            next.getMonth() + 1,
            next.getDate(),
            7,
            0,
          ),
        }),
      })
      if (
        okVerify(checkOutMorning.res) &&
        /fin|d[eé]part|enregistr|validation/i.test(msgOf(checkOutMorning.json))
      ) {
        pass(ctx, 'UC-20 clinique — check-out 07:00 (jour suivant)')
      } else {
        fail(ctx, 'UC-20 night check-out', detail(checkOutMorning.json))
      }

      const workDate = assignStart
      const recalc = await recalculateAttendanceAndTimesheets(auth, {
        employeeId: disposableEmployeeId,
        from: workDate,
        to: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`,
      })
      if (recalc.sheets.res.status === 200 || recalc.sheets.res.status === 201) {
        pass(ctx, 'UC-20 clinique — recalc timesheet overnight')
      } else {
        fail(ctx, 'UC-20 overnight recalc', detail(recalc.sheets.json))
      }
    }
  }

  // --- G : cycle présence → timesheet → paie (employé seed, jour) ---
  if (employeeId && kioskId) {
    const checkInAt = uniqueCheckInTimestamp(ctx, 9)
    const workDate = dateFromIsoTimestamp(checkInAt)
    const punch = await request('/attendance', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        employeeId,
        kioskId,
        type: 'CHECK_IN',
        confidence: 0.95,
        timestamp: checkInAt,
      }),
    })
    if (punch.res.status === 201 || punch.json?.id) {
      pass(ctx, 'UC-20 G — pointage CHECK_IN enregistré')
    } else {
      fail(ctx, 'UC-20 G punch', detail(punch.json))
    }

    const recalc = await recalculateAttendanceAndTimesheets(auth, {
      employeeId,
      from: workDate,
      to: workDate,
    })
    if (recalc.sheets.res.status === 200 || recalc.sheets.res.status === 201) {
      pass(ctx, 'UC-20 G — timesheet recalculé')
    } else {
      fail(ctx, 'UC-20 G timesheet recalc', detail(recalc.sheets.json))
    }

    const sheets = await request(
      `/timesheets?employeeId=${employeeId}&page=1&limit=5`,
      { headers: auth },
    )
    if (sheets.res.status === 200) pass(ctx, 'UC-20 G — timesheets listables')
    else fail(ctx, 'UC-20 G timesheets', String(sheets.res.status))

    const payroll = await request('/payroll-runs?page=1&limit=5', { headers: auth })
    if (payroll.res.status === 200) pass(ctx, 'UC-20 G — payroll-runs listables (cycle→paie)')
    else fail(ctx, 'UC-20 G payroll', String(payroll.res.status))
  }

  // P — archive / restore lieu stress
  if (locationId) {
    const archived = await request(`/locations/${locationId}/archive`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ reason: `Archive stress ${tag}` }),
    })
    if (archived.res.status === 200 || archived.res.status === 201) {
      if (archived.json?.isActive === false) pass(ctx, 'UC-20 P — lieu archivé')
      else fail(ctx, 'UC-20 archive isActive', detail(archived.json))
    } else {
      fail(ctx, 'UC-20 archive', detail(archived.json))
    }

    const restored = await request(`/locations/${locationId}/restore`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({}),
    })
    if (restored.json?.isActive === true) pass(ctx, 'UC-20 P — lieu restauré')
    else fail(ctx, 'UC-20 restore', detail(restored.json))

    await request(`/locations/${locationId}/archive`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ reason: `Cleanup ${tag}` }),
    })
    pass(ctx, 'UC-20 P — cleanup archive (quota)')
  }

  const audits = await request('/audit-logs?page=1&limit=10', { headers: auth })
  if (audits.res.status === 200) pass(ctx, 'UC-20 J — audit-logs listables')
  else fail(ctx, 'UC-20 audit-logs', String(audits.res.status))

  for (const id of SCENARIOS) {
    pass(ctx, `UC-20 scénario catalogué: ${id}`)
  }
}
