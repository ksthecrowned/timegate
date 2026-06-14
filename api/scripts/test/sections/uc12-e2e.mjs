import {
  authHeader,
  dateFromIsoTimestamp,
  detail,
  ensureLeaveTypeId,
  fail,
  pass,
  recalculateAttendanceAndTimesheets,
  request,
  uniqueCheckInTimestamp,
} from '../helpers.mjs'

export async function runUc12(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin) {
    fail(ctx, 'UC-12 Prérequis admin token')
    return
  }

  const branch = await request('/branches', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      name: `E2E Branch ${ctx.unique}`,
      timezone: 'Africa/Brazzaville',
    }),
  })
  if (!branch.json?.id) {
    fail(ctx, 'UC-12 E2E branche', detail(branch.json))
    return
  }
  pass(ctx, 'UC-12 E2E branche créée')
  const branchId = branch.json.id

  const schedule = await request('/shift-types', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      branchId,
      name: `E2E Horaire ${ctx.unique}`,
      startTime: '08:00',
      endTime: '17:00',
      lateGraceMinutes: 10,
    }),
  })
  if (!schedule.json?.id) {
    fail(ctx, 'UC-12 E2E horaire', detail(schedule.json))
    return
  }

  const employeeBody = {
    firstName: 'E2E',
    lastName: `User${ctx.unique}`,
    branchId,
    email: `e2e.${ctx.unique}@test.com`,
    defaultShiftId: schedule.json.id,
  }

  const employee = await request('/employees', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify(employeeBody),
  })
  if (!employee.json?.id) {
    fail(ctx, 'UC-12 E2E employé', detail(employee.json))
    return
  }
  pass(ctx, 'UC-12 E2E employé créé')
  const employeeId = employee.json.id

  const leaveTypeId = await ensureLeaveTypeId(auth)
  if (!leaveTypeId) {
    fail(ctx, 'UC-12 E2E type de congé', 'impossible de créer')
    return
  }
  const leave = await request('/leaves', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      employeeId,
      leaveTypeId,
      startDate: '2026-11-10',
      endDate: '2026-11-11',
      status: 'PENDING',
    }),
  })
  if (leave.json?.id) pass(ctx, 'UC-12 E2E congé créé')
  else fail(ctx, 'UC-12 E2E congé', detail(leave.json))

  const kiosks = await request('/kiosks?page=1&limit=5', { headers: auth })
  const kioskId = kiosks.json?.data?.[0]?.id
  if (!kioskId) {
    fail(ctx, 'UC-12 E2E kiosk', 'aucun kiosk seed')
    return
  }

  const checkInAt = uniqueCheckInTimestamp(ctx, 9)
  const workDate = dateFromIsoTimestamp(checkInAt)
  const checkin = await request('/attendance', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      employeeId,
      kioskId,
      type: 'CHECK_IN',
      confidence: 0.9,
      timestamp: checkInAt,
    }),
  })
  if (checkin.res.status === 201 || checkin.json?.id) pass(ctx, 'UC-12 E2E pointage')
  else fail(ctx, 'UC-12 E2E pointage', detail(checkin.json))

  const recalc = await recalculateAttendanceAndTimesheets(auth, {
    employeeId,
    from: workDate,
    to: workDate,
  })
  if (recalc.days.res.status !== 200 && recalc.days.res.status !== 201) {
    fail(ctx, 'UC-12 E2E recalc présence', detail(recalc.days.json))
  }
  if (recalc.sheets.res.status !== 200 && recalc.sheets.res.status !== 201) {
    fail(ctx, 'UC-12 E2E recalc timesheet', detail(recalc.sheets.json))
  }

  const days = await request(
    `/attendance/days?from=${workDate}&to=${workDate}&employeeId=${employeeId}&limit=5`,
    { headers: auth },
  )
  if (days.res.status === 200) pass(ctx, 'UC-12 E2E jours de présence')
  else fail(ctx, 'UC-12 E2E attendance days', String(days.res.status))

  const sheets = await request(`/timesheets?employeeId=${employeeId}&limit=5`, { headers: auth })
  const sheetId = sheets.json?.data?.[0]?.id
  if (!sheetId) {
    fail(ctx, 'UC-12 E2E timesheet', detail(sheets.json))
    return
  }

  const override = await request(`/timesheets/${sheetId}/override`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({
      workedMinutes: 420,
      lateMinutes: 15,
      reason: `E2E override ${ctx.unique}`,
    }),
  })
  if (override.res.status === 200) pass(ctx, 'UC-12 E2E correction timesheet')
  else fail(ctx, 'UC-12 E2E override', detail(override.json))

  const payroll = await request('/payroll-runs?page=1&limit=5', { headers: auth })
  if (payroll.json?.data?.length) pass(ctx, 'UC-12 E2E paie consultée')
  else fail(ctx, 'UC-12 E2E paie', detail(payroll.json))

  const audit = await request('/audit-logs?page=1&limit=5', { headers: auth })
  if (audit.res.status === 200) pass(ctx, 'UC-12 E2E audit logs')
  else fail(ctx, 'UC-12 E2E audit', String(audit.res.status))
}
