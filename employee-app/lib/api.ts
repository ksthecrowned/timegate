import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { dispatchLogout } from "./authEvents";
import { getDeviceInstallId, setDeviceTrust } from "./deviceInstallId";
import { getPushPlatform } from "./push";
import type {
  AttendanceEventRow,
  BreakResumeStatus,
  CheckinRow,
  Colleague,
  EmployeeContractRow,
  LeaveApplication,
  LeaveBalancesResponse,
  LeaveType,
  PaginatedResponse,
  Profile,
  PunchClaimRow,
  ShiftAssignment,
  ShiftSwapRequest
} from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const TOKEN_KEY = "auth_token";

const FALLBACK_API_URL = "http://192.168.148.97:4001/api/v1";

function resolveApiUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };
  if (extra.apiUrl) return extra.apiUrl;
  if (__DEV__) {
    return (
      Platform.select({
        web: FALLBACK_API_URL,
        android: FALLBACK_API_URL,
        ios: FALLBACK_API_URL,
        default: FALLBACK_API_URL,
      }) ?? FALLBACK_API_URL
    );
  }
  return "/api";
}

const API_URL = resolveApiUrl();

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

export const storeToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  return SecureStore.getItemAsync(TOKEN_KEY);
};

export const removeToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

// ---------------------------------------------------------------------------
// ApiError + fetchApi
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function extractMessage(payload: unknown, fallback: string): string {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (typeof payload === "object") {
    const p = payload as { message?: string | string[] };
    if (Array.isArray(p.message)) return p.message.join(", ");
    if (typeof p.message === "string") return p.message;
  }
  return fallback;
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const token = await getToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  // 401: token expired/invalid. Clear it and broadcast a logout.
  if (response.status === 401) {
    await removeToken().catch(() => undefined);
    dispatchLogout();
    throw new ApiError("Session expirée. Veuillez vous reconnecter.", 401);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = extractMessage(payload, `API error: ${response.status}`);
    throw new ApiError(message, response.status, payload);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// High-level API helpers
// ---------------------------------------------------------------------------

function qs(query: Record<string, unknown> = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const employeeApi = {
  // ----- Auth -----
  identify: (email: string) =>
    fetchApi<{ nextStep: "PASSWORD" | "OTP_SETUP" | "CHECK_EMAIL" }>(
      "/auth/employee/identify",
      { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase() }) },
    ),

  login: async (credentials: { email: string; password: string }) => {
    const deviceInstallId = await getDeviceInstallId();
    const data = await fetchApi<{
      access_token?: string;
      token?: string;
      deviceTrust?: "TRUSTED" | "PENDING";
      employee?: Profile;
      user?: Profile;
    }>("/auth/employee/login", {
      method: "POST",
      body: JSON.stringify({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
        deviceInstallId,
        platform: getPushPlatform(),
      }),
    });
    const token = data.access_token ?? data.token;
    if (token) await storeToken(token);
    if (data.deviceTrust) await setDeviceTrust(data.deviceTrust);
    return { token, user: data.employee ?? data.user, deviceTrust: data.deviceTrust };
  },

  logout: async () => {
    await removeToken().catch(() => undefined);
    await setDeviceTrust(null);
  },

  forgotPassword: (email: string) =>
    fetchApi<{ ok: true }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifyResetCode: (email: string, code: string) =>
    fetchApi<{ ok: true; resetToken: string; expiresIn: number }>(
      "/auth/verify-reset-code",
      {
        method: "POST",
        body: JSON.stringify({ email, code }),
      },
    ),

  resetPassword: (resetToken: string, newPassword: string) =>
    fetchApi<{ ok: true }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ resetToken, newPassword }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    fetchApi<{ ok: true }>("/auth/me/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // ----- Profile -----
  getMe: () => fetchApi<Profile>("/employee/me"),

  updateProfile: (payload: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    language?: string;
  }) =>
    fetchApi<Profile>("/employee/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // ----- Checkins / attendance events -----
  getCheckins: (query: Record<string, unknown> = {}) =>
    fetchApi<PaginatedResponse<CheckinRow>>(`/employee/checkins${qs(query)}`),

  getAttendanceEvents: (query: Record<string, unknown> = {}) =>
    fetchApi<PaginatedResponse<AttendanceEventRow>>(
      `/employee/attendance-events${qs(query)}`,
    ),

  createPunchClaim: (data: {
    workDate: string;
    type: string;
    reason: string;
  }) =>
    fetchApi<PunchClaimRow>("/employee/punch-claims", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getContracts: (query: Record<string, unknown> = {}) =>
    fetchApi<PaginatedResponse<EmployeeContractRow>>(
      `/employee/contracts${qs(query)}`,
    ),

  // ----- Leaves -----
  getLeaves: (query: Record<string, unknown> = {}) =>
    fetchApi<PaginatedResponse<LeaveApplication>>(
      `/employee/leaves${qs(query)}`,
    ),

  createLeave: (data: {
    startDate: string;
    endDate: string;
    leaveTypeId?: string;
    reason?: string;
  }) =>
    fetchApi<LeaveApplication>("/employee/leaves", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createLeaveWithDocument: async (data: {
    startDate: string;
    endDate: string;
    leaveTypeId?: string;
    reason?: string;
    file?: { uri: string; name: string; mimeType?: string };
  }) => {
    const token = await getToken();
    const form = new FormData();
    form.append("startDate", data.startDate);
    form.append("endDate", data.endDate);
    if (data.leaveTypeId) form.append("leaveTypeId", data.leaveTypeId);
    if (data.reason) form.append("reason", data.reason);
    if (data.file) {
      form.append("supportDocument", {
        uri: data.file.uri,
        name: data.file.name,
        type: data.file.mimeType ?? "application/octet-stream",
      } as unknown as Blob);
    }
    const response = await fetch(`${API_URL}/employee/leaves`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
    });
    if (response.status === 401) {
      await removeToken().catch(() => undefined);
      dispatchLogout();
      throw new ApiError("Session expirée. Veuillez vous reconnecter.", 401);
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new ApiError(
        extractMessage(payload, `API error: ${response.status}`),
        response.status,
        payload,
      );
    }
    return (await response.json()) as LeaveApplication;
  },

  getLeaveBalances: (query: Record<string, unknown> = {}) =>
    fetchApi<LeaveBalancesResponse>(`/employee/leave-balances${qs(query)}`),

  getLeaveTypes: () => fetchApi<{ data: LeaveType[] }>("/employee/leave-types"),

  // ----- Shift swaps -----
  getShiftSwaps: (query: Record<string, unknown> = {}) =>
    fetchApi<PaginatedResponse<ShiftSwapRequest>>(`/shift-swaps${qs(query)}`),

  /** Self-service swap creation (uses employee portal route, not the admin route). */
  createShiftSwap: (data: {
    shiftAssignmentId?: string;
    targetEmployeeId?: string;
    swapDate: string;
    reason?: string;
  }) =>
    fetchApi<ShiftSwapRequest>("/employee/shift-swaps", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ----- Planning -----
  getPlanningCalendar: (query: Record<string, unknown> = {}) =>
    fetchApi<{
      from: string;
      to: string;
      branchId: string | null;
      days: Array<{
        date: string;
        assignments: ShiftAssignment[];
        leaves: unknown[];
        holidays: unknown[];
      }>;
    }>(`/planning/calendar${qs(query)}`),

  /**
   * Returns the current employee's upcoming shift assignments (next 14 days).
   * Wraps the planning calendar endpoint and flattens `days[].assignments[]`.
   */
  getMyShifts: async (params: { from: string; to: string }) => {
    const res = await fetchApi<{
      from: string;
      to: string;
      branchId: string | null;
      days: Array<{ date: string; assignments: ShiftAssignment[] }>;
    }>(`/planning/calendar${qs({ from: params.from, to: params.to })}`);
    return res.days.flatMap((d) =>
      (d.assignments ?? []).map((a) => ({ ...a, date: d.date })),
    );
  },

  // ----- Employees / colleagues -----
  getColleagues: (query: Record<string, unknown> = {}) =>
    fetchApi<PaginatedResponse<Colleague>>(`/employees${qs(query)}`),

  // ----- Push devices (FCM / Expo) -----
  registerDevice: (data: { token: string; platform: "IOS" | "ANDROID" | "WEB" }) =>
    fetchApi<{ id: string; platform: string; isActive: boolean }>(
      "/devices/register",
      { method: "POST", body: JSON.stringify(data) },
    ),

  removeDevice: (data: { token: string }) =>
    fetchApi<{ ok: boolean }>("/devices/remove", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ----- In-app notifications -----
  getNotifications: (query: Record<string, unknown> = {}) =>
    fetchApi<{
      data: Array<{
        id: string;
        type: string;
        title: string;
        body: string;
        readAt: string | null;
        createdAt: string;
      }>;
      meta: { unreadCount: number };
    }>(`/notifications${qs(query)}`),

  markNotificationRead: (id: string) =>
    fetchApi(`/notifications/${id}/read`, { method: "PATCH" }),

  markAllNotificationsRead: () =>
    fetchApi("/notifications/read-all", { method: "PATCH" }),

  // ----- QR punch (employee scans kiosk challenge) -----
  scanQrPunch: (payload: string) =>
    fetchApi<{
      ok: true;
      message: string;
      eventType: string;
      employee: { id: string; firstName: string; lastName: string };
      challengeId: string;
    }>("/employee/qr-punch/scan", {
      method: "POST",
      body: JSON.stringify({ payload }),
    }),

  syncQrPunches: (
    items: Array<{ clientId: string; payload: string; scannedAt: string }>,
  ) =>
    fetchApi<{
      results: Array<
        | { clientId: string; ok: true; message: string; eventType?: string }
        | { clientId: string; ok: false; errorCode: string; message: string }
      >;
    }>("/employee/qr-punch/sync", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),

  getBreakResumeStatus: () =>
    fetchApi<BreakResumeStatus>("/employee/break-resume/status"),

  resumeBreak: (data: { latitude: number; longitude: number }) =>
    fetchApi<{ message: string }>("/employee/break-resume", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
