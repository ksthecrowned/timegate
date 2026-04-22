"use client";

import { timegateFetch } from "@/lib/timegate-api";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import type { TimeGateAuditLog, TimeGateListResponse } from "@/types/timegate";
import { useEffect, useState } from "react";

export default function AuditLogsPage() {
  const [rows, setRows] = useState<TimeGateAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await timegateFetch<TimeGateListResponse<TimeGateAuditLog>>("/audit-logs?page=1&limit=100");
        setRows(res.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chargement impossible");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Audit Logs</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Journal d’audit (Super Admin)</p>
      </div>
      {error && <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}
      <TimeGateDataTable
        columns={[
          { key: "date", label: "Date" },
          { key: "action", label: "Action" },
          { key: "entity", label: "Entity" },
          { key: "entityId", label: "Entity ID" },
          { key: "user", label: "User" },
        ]}
        rows={rows}
        loading={loading}
        renderRow={(r) => [
          new Date(r.createdAt).toLocaleString(),
          r.action,
          r.entity,
          r.entityId,
          r.user?.email ?? "—",
        ]}
      />
    </div>
  );
}
