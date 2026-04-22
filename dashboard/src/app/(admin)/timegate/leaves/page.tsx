"use client";

import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import SelectSearch from "@/components/form/SelectSearch";
import { Modal } from "@/components/ui/modal";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import { timegateFetch } from "@/lib/timegate-api";
import type { TimeGateEmployee, TimeGateLeave, TimeGateListResponse } from "@/types/timegate";
import { useEffect, useMemo, useState } from "react";

export default function LeavesPage() {
  const [rows, setRows] = useState<TimeGateLeave[]>([]);
  const [employees, setEmployees] = useState<TimeGateEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })),
    [employees],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [leaves, employeeList] = await Promise.all([
        timegateFetch<TimeGateListResponse<TimeGateLeave>>("/leaves?page=1&limit=100"),
        timegateFetch<TimeGateListResponse<TimeGateEmployee>>("/employees?page=1&limit=100"),
      ]);
      setRows(leaves.data);
      setEmployees(employeeList.data);
      if (!employeeId && employeeList.data[0]?.id) setEmployeeId(employeeList.data[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await timegateFetch("/leaves", {
        method: "POST",
        body: JSON.stringify({
          employeeId,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          status,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      });
      setOpen(false);
      setStartDate("");
      setEndDate("");
      setReason("");
      setStatus("PENDING");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Leaves</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Congés employés</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>Nouveau congé</Button>
      </div>
      {error && <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}
      <TimeGateDataTable
        columns={[
          { key: "employee", label: "Employé" },
          { key: "startDate", label: "Début" },
          { key: "endDate", label: "Fin" },
          { key: "status", label: "Statut" },
          { key: "reason", label: "Raison" },
        ]}
        rows={rows}
        loading={loading}
        renderRow={(row) => [
          row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : row.employeeId,
          new Date(row.startDate).toLocaleDateString(),
          new Date(row.endDate).toLocaleDateString(),
          row.status,
          row.reason ?? "—",
        ]}
      />

      <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-[640px] p-5 lg:p-8">
        <form onSubmit={onCreate} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Créer un congé</h3>
          <SelectSearch label="Employé" options={employeeOptions} value={employeeId} onChange={setEmployeeId} placeholder="Sélectionner un employé" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><Label>Date début</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></div>
            <div><Label>Date fin</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required /></div>
          </div>
          <div>
            <Label>Statut</Label>
            <Select
              options={[{ value: "PENDING", label: "PENDING" }, { value: "APPROVED", label: "APPROVED" }, { value: "REJECTED", label: "REJECTED" }]}
              value={status}
              onChange={(v) => setStatus(v as "PENDING" | "APPROVED" | "REJECTED")}
            />
          </div>
          <div><Label>Raison</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <div className="flex justify-end"><Button size="sm" disabled={saving}>{saving ? "Création..." : "Créer"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
