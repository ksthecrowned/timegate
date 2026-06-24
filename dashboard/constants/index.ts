import { SelectOption } from "@/components/ui/select-search-types";

export const STATUS_OPTIONS: SelectOption[] = [
  { value: "PRESENT", label: "Présent" },
  { value: "ABSENT", label: "Absent" },
  { value: "HALF_DAY", label: "Demi-journée" },
  { value: "ON_LEAVE", label: "En congé" },
  { value: "ON_HOLIDAY", label: "Jour férié" },
  { value: "WORK_FROM_HOME", label: "Télétravail" },
  { value: "ACCEPTED", label: "Accepté" },
  { value: "REJECTED", label: "Rejeté" },
  { value: "CLOSED", label: "Fermée" },
  { value: "OPEN", label: "Ouverte" },
];

export type REVIEW_STATUS = "APPROVED" | "REJECTED";
