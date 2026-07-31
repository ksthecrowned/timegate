"use client";

import { employeeTableColumn } from "@/components/timegate/employee-table-column";
import { ApiErrorBanner } from "@/components/timegate/ui";
import ActionButtons from "@/components/ui/ActionButtons";
import DataTable, { Column } from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { STATUS_OPTIONS } from "@/constants";
import { HttpError } from "@/lib/http";
import { findOption } from "@/lib/select-options";
import { listAttendanceEvents } from "@/lib/timegate/attendance";
import type { AttendanceEvent } from "@/lib/timegate/types";
import { useCallback, useEffect, useState } from "react";

const columns: Column<AttendanceEvent>[] = [
  employeeTableColumn<AttendanceEvent>(),
  {
    key: "type",
    label: "Type",
    filterable: true,
    filterPlaceholder: "type",
    render: (v) =>
      v === "CHECK_IN" ? "Arrivée" : v === "CHECK_OUT" ? "Départ" : "-",
  },
  {
    key: "status",
    label: "Statut",
    filterable: true,
    filterPlaceholder: "statut",
    render: (v) => (
      <StatusBadge
        status={findOption(STATUS_OPTIONS, v as string)?.label || ""}
      />
    ),
  },
  {
    key: "source",
    label: "Source",
    filterable: true,
    filterPlaceholder: "source",
    render: (v) =>
      v === "KIOSK_ONLINE" ? "Kiosque actif" : v === "MANUAL" ? "Manuel" : "-",
  },
  {
    key: "kiosk",
    label: "Kiosque",
    render: (_, row) => row.kiosk?.name ?? "—",
  },
  {
    key: "occurredAt",
    label: "Horodatage",
    sortable: true,
    render: (v) => (v ? new Date(String(v)).toLocaleString("fr-FR") : "—"),
  },
  {
    key: "confidence",
    label: "Confiance",
    render: (v) => (v != null ? `${Math.round(Number(v) * 100)} %` : "—"),
  },
];

export default function AttendanceEventsPage() {
  const [data, setData] = useState<AttendanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listAttendanceEvents({ page: 1, limit: 100 });
      setData(res.data);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div data-tour="attendance-events">
      <PageHeader
        breadcrumbs={[
          { label: "Présence" },
          { label: "Événements de pointage" }
      ]}
      />

      <ApiErrorBanner message={error} />

      <DataTable
        loading={loading}
        data={data}
        columns={columns}
        entityLabel="événements"
        tableId="hs-attendance-events-table"
        emptyMessage="Aucun événement de pointage."
        actions={(row) => (
          <ActionButtons viewHref={`/attendance/events/${row.id}`} />
        )}
      />
    </div>
  );
}
