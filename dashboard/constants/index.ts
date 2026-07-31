import { SelectOption } from "@/components/ui/select-search-types";

export const STATUS_OPTIONS: SelectOption[] = [
  { value: "PRESENT", label: "Présent" },
  { value: "ABSENT", label: "Absent" },
  { value: "HALF_DAY", label: "Demi-journée" },
  { value: "ON_LEAVE", label: "En congé" },
  { value: "ON_HOLIDAY", label: "Jour férié" },
  { value: "ACCEPTED", label: "Accepté" },
  { value: "REJECTED", label: "Rejeté" },
  { value: "CLOSED", label: "Fermée" },
  { value: "OPEN", label: "Ouverte" },
  { value: "REVIEW_REQUIRED", label: "À valider" },
];

export type REVIEW_STATUS = "APPROVED" | "REJECTED";

/** Libellé d’affichage (legacy WORK_FROM_HOME → Présent). */
export function attendanceStatusLabel(status: string | null | undefined): string {
  if (!status) return "";
  if (status === "WORK_FROM_HOME") return "Présent";
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}
