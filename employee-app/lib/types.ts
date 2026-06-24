/**
 * Shared TypeScript types for the employee-app API layer.
 * Shapes mirror the backend responses (see api/src/employee-portal/employee-portal.service.ts
 * and api/src/leaves, api/src/shift-swaps, etc.).
 */

export type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  loginEmail: string | null;
  phone: string | null;
  status: string;
  branchId: string | null;
  branchName: string | null;
  departmentId: string | null;
  department: string | null;
  designationId: string | null;
  position: string | null;
  defaultShiftName: string | null;
  companyId: string | null;
  organizationName: string | null;
  organizationSku: string | null;
  language: string | null;
};

export type LeaveBalance = {
  leaveTypeId: string;
  leaveTypeName: string;
  year: number;
  allocated: number;
  used: number;
  remaining: number;
  unlimited: boolean;
};

export type LeaveType = {
  id: string;
  name: string;
  maxDaysPerYear: number | null;
};

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | string;

export type LeaveApplication = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveStatus;
  leaveType: { id: string; name: string } | null;
};

export type ShiftSwapStatus = 'pending' | 'approved' | 'rejected' | string;

export type ShiftSwapRequest = {
  id: string;
  swapDate: string;
  reason: string | null;
  status: ShiftSwapStatus;
  requesterEmployeeId: string;
  targetEmployeeId: string | null;
  shiftAssignmentId: string | null;
  requester: { id: string; firstName: string; lastName: string } | null;
  target: { id: string; firstName: string; lastName: string } | null;
  shift: { id: string; name: string; date?: string } | null;
};

export type CheckinRow = {
  id: string;
  attendanceDate?: string;
  date?: string;
  status?: string;
  checkIn?: string | null;
  checkOut?: string | null;
};

export type ShiftAssignment = {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  shiftName?: string;
  location?: string | null;
};

export type Colleague = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  position?: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number };
};

export type LeaveBalancesResponse = {
  employeeId: string;
  year: number;
  balances: LeaveBalance[];
};

export type ApiErrorPayload = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};