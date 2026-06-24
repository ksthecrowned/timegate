type Status = string;

const cfg: Record<string, { label: string; cls: string }> = {
  active: {
    label: "Actif",
    cls: "bg-teal-100 text-teal-800 dark:bg-teal-500/10 dark:text-teal-500",
  },
  inactive: {
    label: "Inactif",
    cls: "bg-gray-100 text-gray-800 dark:bg-neutral-700 dark:text-neutral-300",
  },
  pending: {
    label: "En attente",
    cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-500",
  },
  quarantine: {
    label: "Quarantaine",
    cls: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-500",
  },
  completed: {
    label: "Terminé",
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-500",
  },
  cancelled: {
    label: "Annulé",
    cls: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-500",
  },
  approved: {
    label: "Approuvé",
    cls: "bg-teal-100 text-teal-800 dark:bg-teal-500/10 dark:text-teal-500",
  },
  rejected: {
    label: "Rejeté",
    cls: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-500",
  },
  online: {
    label: "En ligne",
    cls: "bg-teal-100 text-teal-800 dark:bg-teal-500/10 dark:text-teal-500",
  },
  offline: {
    label: "Hors ligne",
    cls: "bg-gray-100 text-gray-800 dark:bg-neutral-700 dark:text-neutral-300",
  },
  suspended: {
    label: "Suspendu",
    cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-500",
  },
  processing: {
    label: "En cours",
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-500",
  },
  ["Présent"]: {
    label: "Présent",
    cls: "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-500",
  },
  ["Absent"]: {
    label: "Absent",
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-500",
  },
  ["Demi-journée"]: {
    label: "Demi-journée",
    cls: "bg-gray-100 text-gray-800 dark:bg-gray-500/10 dark:text-gray-500",
  },
  ["En congé"]: {
    label: "En congé",
    cls: "bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-500",
  },
  ["Jour férié"]: {
    label: "Jour férié",
    cls: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-500",
  },
  ["Télétravail"]: {
    label: "Télétravail",
    cls: "bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-500",
  },
  ["Accepté"]: {
    label: "Accepté",
    cls: "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-500",
  },
  ["Rejeté"]: {
    label: "Rejeté",
    cls: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-500",
  },
  ["Ouverte"]: {
    label: "Ouverte",
    cls: "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-500",
  },
  ["Fermée"]: {
    label: "Fermée",
    cls: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-500",
  },
};

export default function StatusBadge({ status }: { status: Status }) {
  const c = cfg[status] ?? {
    label: status,
    cls: "bg-gray-100 text-gray-800 dark:bg-neutral-700 dark:text-neutral-300",
  };
  return (
    <span
      className={`py-1 px-2 inline-flex items-center gap-x-1 text-xs font-medium rounded-full ${c.cls}`}
    >
      <svg
        className="shrink-0 size-3"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      {c.label}
    </span>
  );
}
