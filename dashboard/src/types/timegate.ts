export type TimeGateRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER";

export interface TimeGateUser {
  id: string;
  email: string;
  role: TimeGateRole;
  createdAt: string;
}

export interface TimeGateSite {
  id: string;
  name: string;
  address: string | null;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimeGateEmployee {
  id: string;
  siteId: string | null;
  scheduleId?: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  birthDate?: string | null;
  whatsappPhone?: string | null;
  phone?: string | null;
  address?: string | null;
  employeeCode?: string | null;
  hireDate?: string | null;
  contractType?: string | null;
  nationalId?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  photoUrl?: string | null;
  department?: string | null;
  position?: string | null;
  isActive?: boolean;
  luxandPersonUuid: string | null;
  hasFaceEmbedding?: boolean;
  createdAt: string;
  updatedAt: string;
  schedule?: { id: string; name: string; siteId: string } | null;
}

export interface TimeGateEmployeeContract {
  id: string;
  employeeId: string;
  organizationId: string;
  signedAt: string;
  expiresAt: string | null;
  renewalsCount: number;
  contractFileUrl: string | null;
  notes: string | null;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode?: string | null;
  };
}

export interface TimeGateLateRecord {
  id: string;
  employeeId: string;
  organizationId: string;
  attendanceId?: string | null;
  date: string;
  latenessMinutes: number;
  justified: boolean;
  reason?: string | null;
  justificationFileUrl?: string | null;
  createdAt: string;
  employee?: { id: string; firstName: string; lastName: string; employeeCode?: string | null };
}

export interface TimeGateAbsenceRecord {
  id: string;
  employeeId: string;
  organizationId: string;
  date: string;
  justified: boolean;
  reason?: string | null;
  justificationFileUrl?: string | null;
  createdAt: string;
  employee?: { id: string; firstName: string; lastName: string; employeeCode?: string | null };
}

export type TimeGateSalaryStatus = "PENDING" | "PAID";

export interface TimeGateSalaryRecord {
  id: string;
  employeeId: string;
  organizationId: string;
  year: number;
  month: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  status: TimeGateSalaryStatus;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
  employee?: { id: string; firstName: string; lastName: string; employeeCode?: string | null };
}

export type TimeGateDeviceStatus = "ONLINE" | "OFFLINE";

export interface TimeGateDevice {
  id: string;
  siteId: string;
  name: string;
  location: string | null;
  status: TimeGateDeviceStatus;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  site?: { id: string; name: string };
}

export type TimeGateAttendanceType = "CHECK_IN" | "CHECK_OUT";

export interface TimeGateAttendanceEvent {
  id: string;
  employeeId: string;
  deviceId: string;
  type: TimeGateAttendanceType;
  timestamp: string;
  confidence: number;
  createdAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    siteId: string | null;
  };
  device?: {
    id: string;
    name: string;
    siteId: string;
    site?: { id: string; name: string };
  };
}

export interface TimeGateRecognitionLog {
  id: string;
  employeeId: string | null;
  deviceId: string;
  success: boolean;
  confidence: number | null;
  imageUrl: string | null;
  createdAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  device?: {
    id: string;
    name: string;
    siteId: string;
    site?: { id: string; name: string };
  };
}

export interface TimeGateWorkSchedule {
  id: string;
  siteId: string;
  organizationId: string;
  name: string;
  startTime: string;
  endTime: string;
  lateGraceMinutes: number;
  createdAt: string;
  site?: { id: string; name: string };
}

export type TimeGateLeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TimeGateLeave {
  id: string;
  employeeId: string;
  organizationId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: TimeGateLeaveStatus;
  createdAt: string;
  employee?: { id: string; firstName: string; lastName: string };
}

export interface TimeGateWorkSession {
  id: string;
  employeeId: string;
  organizationId: string;
  checkInId: string;
  checkOutId: string | null;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
  createdAt: string;
  employee?: { id: string; firstName: string; lastName: string };
}

export interface TimeGateSystemConfig {
  id: string;
  organizationId: string;
  minConfidence: number;
  lateThreshold: number;
  veryLateThreshold: number;
  createdAt: string;
  organization?: { id: string; name: string; sku: string };
}

export interface TimeGateSubscription {
  id: string;
  organizationId: string;
  plan: string;
  maxEmployees: number;
  maxDevices: number;
  expiresAt: string | null;
  createdAt: string;
  organization?: { id: string; name: string; sku: string };
}

export interface TimeGateAuditLog {
  id: string;
  organizationId: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  user?: { id: string; email: string; role: TimeGateRole } | null;
  organization?: { id: string; name: string; sku: string };
}

export type TimeGateWeekDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface TimeGateWorkDay {
  id: string;
  scheduleId: string;
  day: TimeGateWeekDay;
  startTime: string;
  endTime: string;
  schedule?: { id: string; name: string; siteId: string };
}

export interface TimeGateHoliday {
  id: string;
  organizationId: string;
  name: string;
  date: string;
  organization?: { id: string; name: string; sku: string };
}

export interface TimeGateListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimeGateListResponse<T> {
  data: T[];
  meta: TimeGateListMeta;
}
