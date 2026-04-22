"use client";

import { timegateFetch } from "@/lib/timegate-api";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import type { TimeGateListResponse, TimeGateSubscription } from "@/types/timegate";
import { useEffect, useState } from "react";

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<TimeGateSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await timegateFetch<TimeGateListResponse<TimeGateSubscription>>("/subscriptions?page=1&limit=100");
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
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Subscriptions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Abonnements organisations (Super Admin)</p>
      </div>
      {error && <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}
      <TimeGateDataTable
        columns={[
          { key: "organization", label: "Organisation" },
          { key: "plan", label: "Plan" },
          { key: "maxEmployees", label: "Max employés" },
          { key: "maxDevices", label: "Max appareils" },
          { key: "expiresAt", label: "Expire le" },
        ]}
        rows={rows}
        loading={loading}
        renderRow={(r) => [
          r.organization?.name ?? r.organizationId,
          r.plan,
          String(r.maxEmployees),
          String(r.maxDevices),
          r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "—",
        ]}
      />
    </div>
  );
}
