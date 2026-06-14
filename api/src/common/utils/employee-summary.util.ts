export const employeeSummarySelect = {
  id: true,
  firstName: true,
  lastName: true,
  employeeName: true,
  faceEnrollmentPhoto: true,
} as const;

export const employeeSummaryWithBranchSelect = {
  ...employeeSummarySelect,
  branchId: true,
} as const;

export type EmployeeSummarySource = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  employeeName?: string | null;
  faceEnrollmentPhoto?: string | null;
  branchId?: string | null;
};

export function toEmployeeSummary(
  employee: EmployeeSummarySource | null | undefined,
  options?: { includeBranchId?: boolean },
) {
  if (!employee) return null;

  const firstName = employee.firstName ?? employee.employeeName ?? '';
  const lastName = employee.lastName ?? '';

  const summary = {
    id: employee.id,
    firstName,
    lastName,
    photoUrl: employee.faceEnrollmentPhoto ?? null,
  };

  if (options?.includeBranchId) {
    return { ...summary, branchId: employee.branchId ?? null };
  }

  return summary;
}
