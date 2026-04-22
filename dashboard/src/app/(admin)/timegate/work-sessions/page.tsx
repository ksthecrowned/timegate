"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import SelectSearch from "@/components/form/SelectSearch";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import { timegateFetch } from "@/lib/timegate-api";
import type { TimeGateEmployee, TimeGateListResponse, TimeGateWorkSession } from "@/types/timegate";
import { useEffect, useMemo, useState } from "react";

export default function WorkSessionsPage() {
  const [rows, setRows] = useState<TimeGateWorkSession[]>([]);
  const [employees, setEmployees] = useState<TimeGateEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })),
    [employees],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: "1", limit: "100" });
      if (employeeId) params.set("employeeId", employeeId);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());
      const [sessions, employeeList] = await Promise.all([
        timegateFetch<TimeGateListResponse<TimeGateWorkSession>>(`/work-sessions?${params.toString()}`),
        timegateFetch<TimeGateListResponse<TimeGateEmployee>>("/employees?page=1&limit=100"),
      ]);
      setRows(sessions.data);
      setEmployees(employeeList.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [employeeId, from, to]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Work Sessions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Sessions de travail calculées</p>
      </div>
      {error && <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}

      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3 md:grid-cols-3">
        <SelectSearch label="Employé" options={[{ value: "", label: "Tous" }, ...employeeOptions]} value={employeeId} onChange={setEmployeeId} placeholder="Tous les employés" />
        <div><Label>Du</Label><Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>Au</Label><Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      <TimeGateDataTable
        columns={[
          { key: "employee", label: "Employé" },
          { key: "startedAt", label: "Début" },
          { key: "endedAt", label: "Fin" },
          { key: "duration", label: "Durée (min)" },
        ]}
        rows={rows}
        loading={loading}
        renderRow={(row) => [
          row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : row.employeeId,
          new Date(row.startedAt).toLocaleString(),
          row.endedAt ? new Date(row.endedAt).toLocaleString() : "—",
          String(row.duration ?? "—"),
        ]}
      />
    </div>
  );
}
