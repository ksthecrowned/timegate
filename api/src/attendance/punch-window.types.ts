export type ResolvedPunchWindows = {
  shiftTypeId: string | null;
  allowCheckInAfterBreakStart: boolean;
  shiftStartMin: number;
  shiftEndMin: number;
  checkInStartMin: number;
  checkInEndMin: number;
  checkOutStartMin: number;
  checkOutEndMin: number;
  breakStartMin: number | null;
  breakEndMin: number | null;
  breakDurationMinutes: number;
};

export type DayPunchState = {
  hasCheckIn: boolean;
  hasCheckOut: boolean;
  hasBreakEnd: boolean;
  checkInAtMin: number | null;
};

export type PunchResolution =
  | { action: 'CHECK_IN'; message: string; lateAbsent?: boolean }
  | { action: 'CHECK_OUT'; message: string; inferBreakEnd?: boolean }
  | { action: 'BREAK_END'; message: string }
  | { action: 'NONE'; message: string }
  | { action: 'REJECTED'; message: string };
