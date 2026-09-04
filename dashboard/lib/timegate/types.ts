export type TimeGateRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE'

export type EmployeeSummary = {
  id?: string
  firstName?: string | null
  lastName?: string | null
  employeeName?: string | null
  photoUrl?: string | null
  branchId?: string | null
}

export type TimeGateUser = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  role: string
  companyId: string | null
  employeeId?: string | null
}

export type LoginResponse = {
  access_token: string
  refresh_token: string
  expires_in?: number
}

export type SubscriptionStatus = {
  active: boolean
  readOnly: boolean
  blocked: boolean
  status:
    | 'TRIAL'
    | 'ACTIVE'
    | 'GRACE_READ_ONLY'
    | 'BLOCKED'
    | 'SUSPENDED'
    | null
  role: string
  subscription: {
    id: string
    plan: string
    planId?: string | null
    maxEmployees: number
    maxKiosks: number
    maxDevices: number
    status?: string
    storedStatus?: string
    source?: string
    trialEndsAt?: string | null
    graceEndsAt?: string | null
    expiresAt: string | null
    daysUntilExpiry?: number | null
    daysUntilGraceEnd?: number | null
    usage?: {
      employees: number
      kiosks: number
      maxEmployees: number
      maxKiosks: number
    }
  } | null
}

export type SignupResponse = {
  access_token: string
  refresh_token: string
  expires_in?: number
  organization: { id: string; name: string | null; sku: string | null }
  subscription: {
    status: string
    plan: string
    maxEmployees: number
    maxKiosks: number
    trialEndsAt: string | null
    expiresAt: string | null
  }
}

export type Branch = {
  id: string
  name: string
  branchCode?: string | null
  address?: string | null
  timezone?: string | null
  cityId?: string | null
  countryId?: string | null
  latitude?: number | null
  longitude?: number | null
  checkinRadius?: number | null
  phone?: string | null
  email?: string | null
  isHeadOffice?: boolean
  isActive?: boolean
  city?: { id: string; name: string } | null
  country?: { id: string; name: string; isoCode: string } | null
  companyId: string
  createdAt: string
  updatedAt: string
}

export type Employee = {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  whatsappPhone?: string | null
  hireDate?: string | null
  isActive: boolean
  status: string
  companyId: string
  branchId?: string | null
  department?: string | null
  designation?: string | null
  employmentType?: string | null
  branch?: { id: string; name: string; address?: string | null } | null
  departmentId?: string | null
  designationId?: string | null
  employmentTypeId?: string | null
  defaultShiftId?: string | null
  holidayListId?: string | null
  payGroupId?: string | null
  payDueDayOverride?: number | null
  payGroup?: { id: string; name: string; payDayOfMonth: number } | null
  birthDate?: string | null
  gender?: string | null
  nationality?: string | null
  maritalStatus?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  cityId?: string | null
  countryId?: string | null
  province?: string | null
  postalCode?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  nationalIdNumber?: string | null
  passportNumber?: string | null
  city?: { id: string; name: string } | null
  country?: { id: string; name: string; isoCode: string } | null
  defaultShift?: { id: string; name: string; branchId?: string | null } | null
  holidayList?: { id: string; name: string } | null
  photoUrl?: string | null
  faceEnrolledAt?: string | null
  hasFaceEmbedding?: boolean
  hasKioskPin?: boolean
  hasNfcBadge?: boolean
  nfcBadgeUid?: string | null
  userId?: string | null
  linkedUser?: { id: string; email: string } | null
  createdAt: string
  updatedAt: string
}

export type Kiosk = {
  id: string
  name: string
  branchId: string
  companyId: string
  shiftLocationId?: string | null
  shiftLocation?: { id: string; name: string } | null
  location?: string | null
  status: string
  isActive: boolean
  lastSeenAt?: string | null
  faceEnabled?: boolean
  nfcEnabled?: boolean
  qrEnabled?: boolean
  branch?: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

export type AttendanceDay = {
  id: string
  employeeId: string
  employeeName?: string | null
  attendanceDate?: string
  date: string
  status: string
  companyId?: string | null
  shiftId?: string | null
  leaveTypeId?: string | null
  employee?: EmployeeSummary | null
  leaveType?: { id: string; leaveTypeName: string } | null
  shift?: { id: string; name?: string | null; startTime?: string | null; endTime?: string | null } | null
}

export type AttendanceDayStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'ON_LEAVE'
  | 'ON_HOLIDAY'

export type EmployeeContract = {
  id: string
  employeeId: string
  companyId: string
  signedAt: string
  expiresAt?: string | null
  renewalsCount: number
  contractFileUrl?: string | null
  notes?: string | null
  isCurrent: boolean
  createdAt: string
  updatedAt: string
  employee?: EmployeeSummary | null
}

export type ActivationKeyResult = {
  id: string
  companyId: string
  plan: string
  maxEmployees: number
  maxKiosks: number
  expiresAt: string
  createdAt: string
  activationKey: string
}

export type AttendanceEvent = {
  id: string
  employeeId?: string | null
  kioskId?: string | null
  type: string
  status: string
  source: string
  confidence?: number | null
  occurredAt: string
  receivedAt?: string | null
  rejectReason?: string | null
  employee?: EmployeeSummary | null
  kiosk?: { id: string; name: string } | null
  branch?: { id: string; name: string } | null
}

export type NamedEntity = {
  id: string
  name: string
  companyId?: string
  createdAt?: string
  updatedAt?: string
}

export type Department = NamedEntity & {
  code?: string | null
  description?: string | null
  parentDepartmentId?: string | null
  companyId: string
  createdAt: string
  updatedAt: string
}
export type Designation = Department
export type EmploymentPayMode = 'MONTHLY' | 'FLAT'

export type EmploymentType = {
  id: string
  name: string
  companyId: string
  includeInPayroll: boolean
  accruesLeave: boolean
  payMode: EmploymentPayMode
  createdAt: string
  updatedAt: string
}

export type LeaveType = {
  id: string
  name: string
  leaveTypeName: string
  companyId?: string | null
  isLwp: boolean
  isCarryForward: boolean
  maxDaysPerYear?: number | null
  createdAt: string
  updatedAt: string
}

export type HolidayList = {
  id: string
  name: string
  holidayListName: string
  companyId?: string | null
  createdAt: string
  updatedAt: string
  company?: { id: string; name: string; sku?: string } | null
}

export type ShiftType = {
  id: string
  name: string
  branchId: string
  companyId: string
  startTime: string
  endTime: string
  lateGraceMinutes?: number | null
  checkInWindowStart?: string | null
  checkInWindowEnd?: string | null
  checkOutWindowStart?: string | null
  checkOutWindowEnd?: string | null
  breakWindowStart?: string | null
  breakWindowEnd?: string | null
  breakDurationMinutes?: number | null
  createdAt: string
  branch?: { id: string; name: string } | null
  weekDays?: WorkDay[]
}

export type ShiftAssignment = {
  id: string
  employeeId: string
  shiftTypeId: string
  shiftLocationId?: string | null
  companyId: string
  startDate?: string | null
  endDate?: string | null
  createdAt: string
  updatedAt: string
  employee?: EmployeeSummary | null
  shiftType?: { id: string; name: string; branchId?: string | null } | null
  shiftLocation?: { id: string; name: string } | null
}

export type WeekDayName =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'

export type WorkDay = {
  id: string
  shiftTypeId: string
  day: WeekDayName
  startTime: string
  endTime: string
  shiftType?: { id: string; name: string; branchId?: string | null } | null
}

export type Holiday = {
  id: string
  companyId: string
  holidayListId?: string | null
  holidayListName?: string | null
  name: string
  date: string
  createdAt: string
  company?: { id: string; name: string; sku?: string } | null
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type Leave = {
  id: string
  employeeId: string
  companyId: string
  startDate: string
  endDate: string
  reason?: string | null
  status: LeaveStatus
  type?: string | null
  leaveTypeId?: string | null
  createdAt: string
  employee?: EmployeeSummary | null
  leaveType?: { id: string; leaveTypeName: string } | null
}

export type Absence = {
  id: string
  employeeId: string
  companyId: string
  date: string
  justified: boolean
  reason?: string | null
  justificationFileUrl?: string | null
  createdAt: string
  employee?: EmployeeSummary | null
}

export type LateRecord = {
  id: string
  employeeId: string
  companyId: string
  attendanceId?: string | null
  date: string
  latenessMinutes: number
  justified: boolean
  reason?: string | null
  justificationFileUrl?: string | null
  createdAt: string
  employee?: EmployeeSummary | null
}

export type TimesheetDay = {
  id: string
  companyId: string
  employeeId: string
  date: string
  workedMinutes: number
  breakMinutes: number
  lateMinutes: number
  overtimeMinutes: number
  status: string
  ruleVersion?: string | null
  anomalyFlags?: string[] | { flags?: string[] } | null
  createdAt: string
  updatedAt: string
  employee?: EmployeeSummary | null
}

export type TimesheetOverride = {
  id: string
  timesheetDayId: string
  companyId: string
  managerUserId: string
  manager?: { id: string; email: string } | null
  reason: string
  meta?: Record<string, unknown> | null
  createdAt: string
}

export type PayrollRunStatus = 'DRAFT' | 'LOCKED' | 'PARTIALLY_PAID' | 'PAID'

export type PayrollRunTotals = {
  baseSalary: number
  fixedAllowances: number
  fixedDeductions: number
  variableAllowances: number
  variableDeductions: number
  overtime: number
  penalties: number
  gross: number
  net: number
}

export type PayrollRunPaymentProgress = {
  linesCount: number
  paidCount: number
  unpaidCount: number
  percentPaid: number
}

export type PayrollRun = {
  id: string
  companyId: string
  year: number
  month: number
  status: PayrollRunStatus
  ruleVersion?: string | null
  createdAt: string
  lockedAt?: string | null
  paidAt?: string | null
  _count?: { lines: number }
  totals?: PayrollRunTotals
  paymentProgress?: PayrollRunPaymentProgress
}

export type PayrollLinePaymentStatus = 'UNPAID' | 'PAID'

export type PayrollLine = {
  id: string
  payrollRunId: string
  companyId: string
  employeeId: string
  baseSalary: number
  overtimeAmount: number
  penaltyAmount: number
  absenceAmount: number
  bonusAmount: number
  netSalary: number
  fixedAllowancesTotal: number
  fixedDeductionsTotal: number
  variableAllowancesTotal: number
  variableDeductionsTotal: number
  lateMinutesPenalty: number
  gross: number
  periodStart?: string | null
  periodEnd?: string | null
  explainJson?: Record<string, unknown> | null
  dueDate?: string | null
  paidAt?: string | null
  paymentStatus?: PayrollLinePaymentStatus
  createdAt: string
  employee?: EmployeeSummary | null
}

export type PayrollBranchPaymentSummary = {
  branchId: string | null
  branchName: string | null
  total: number
  paid: number
  unpaid: number
  gross?: number
  net?: number
  unpaidEmployeeIds: string[]
  unpaidEmployees?: { id: string; name: string }[]
}

export type CompensationGridEntry = {
  id: string
  companyId: string
  designationId: string
  employmentTypeId: string
  baseSalary: number
  effectiveFrom: string
  effectiveTo?: string | null
  createdAt: string
  updatedAt: string
}

export type PayGroup = {
  id: string
  companyId: string
  name: string
  payDayOfMonth: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type SalaryAdvanceStatus = 'PENDING' | 'DISBURSED' | 'DEDUCTED' | 'CANCELLED'

export type SalaryAdvance = {
  id: string
  companyId: string
  employeeId: string
  amount: number
  status: SalaryAdvanceStatus
  notes?: string | null
  paidAt?: string | null
  deductedAt?: string | null
  payrollRunId?: string | null
  payrollVariableItemId?: string | null
  createdAt: string
  updatedAt: string
}

export type EmployeeCompensationSummary = {
  currency: string
  baseSalary: number
  baseSource: 'GRID' | 'NONE'
  fixedAllowances: number
  fixedDeductions: number
  /** Base + indemnités fixes (avant retenues). */
  fixedMonthly: number
  /** Base + indemnités − retenues fixes. */
  fixedMonthlyNet: number
  allowances: Array<{ label: string; amount: number }>
  deductions: Array<{ label: string; amount: number }>
  lastMonth: {
    year: number
    month: number
    runId: string | null
    runStatus: string | null
    gross: number | null
    net: number | null
    paymentStatus: string | null
    paidAt: string | null
  }
}

export type FaceRecognitionLog = {
  id: string
  kioskId?: string | null
  branchId?: string | null
  companyId: string
  employeeId?: string | null
  success: boolean
  confidence?: number | null
  imageUrl?: string | null
  offlineSync?: boolean
  capturedAt: string
  createdAt: string
  employee?: EmployeeSummary | null
  kiosk?: {
    id: string
    name: string
    branchId?: string | null
    branch?: { id: string; name: string } | null
  } | null
}

export type AuditLog = {
  id: string
  companyId: string
  userId?: string | null
  action: string
  entity: string
  entityId?: string | null
  createdAt: string
  user?: { id: string; email: string; role?: string | null } | null
  company?: { id: string; name: string; sku?: string } | null
}

export type Subscription = {
  id: string
  companyId: string
  plan: string
  maxEmployees: number
  maxKiosks: number
  expiresAt: string
  createdAt: string
  company?: { id: string; name: string; sku?: string } | null
}

export type NotificationRule = {
  type: string
  inAppEnabled: boolean
  pushEnabled: boolean
  emailEnabled: boolean
}

export type SystemConfig = {
  id: string
  companyId: string
  minConfidence: number
  lateThreshold: number
  veryLateThreshold: number
  pinFailureThreshold?: number
  pinFailureCooldownSeconds?: number
  timesheetRoundingMinutes?: number
  overtimeAlertThresholdMinutes?: number
  minMinutesBetweenShifts?: number
  defaultFaceEnabled?: boolean
  defaultNfcEnabled?: boolean
  defaultQrEnabled?: boolean
  notificationUnclosedReminderDelayMinutes?: number
  notificationReviewReminderMinAgeMinutes?: number
  allowOfflineSync?: boolean
  offlineSyncMaxAgeMinutes?: number
  faceLogPhotoRetentionDays?: number
  webhookEnabled?: boolean
  webhookUrl?: string | null
  webhookSecret?: string | null
  defaultShiftTypeId?: string | null
  defaultShiftType?: { id: string; name: string } | null
  /** Prefill nouveaux horaires (HH:mm) */
  defaultBreakWindowStart?: string | null
  defaultBreakWindowEnd?: string | null
  defaultBreakDurationMinutes?: number
  allowCheckInAfterBreakStart?: boolean
  company?: { id: string; name: string; sku?: string } | null
}

/** Paramètres pointage tenant (kiosk / fallback horaire). */
export type TenantAttendanceSettings = Pick<
  SystemConfig,
  | 'id'
  | 'companyId'
  | 'timesheetRoundingMinutes'
  | 'overtimeAlertThresholdMinutes'
  | 'minMinutesBetweenShifts'
  | 'defaultFaceEnabled'
  | 'defaultNfcEnabled'
  | 'defaultQrEnabled'
  | 'notificationUnclosedReminderDelayMinutes'
  | 'notificationReviewReminderMinAgeMinutes'
  | 'allowOfflineSync'
  | 'offlineSyncMaxAgeMinutes'
  | 'faceLogPhotoRetentionDays'
  | 'webhookEnabled'
  | 'webhookUrl'
  | 'webhookSecret'
  | 'defaultShiftTypeId'
  | 'defaultShiftType'
  | 'defaultBreakWindowStart'
  | 'defaultBreakWindowEnd'
  | 'allowCheckInAfterBreakStart'
  | 'minConfidence'
  | 'lateThreshold'
> & {
  kiosksUpdated?: number
}
