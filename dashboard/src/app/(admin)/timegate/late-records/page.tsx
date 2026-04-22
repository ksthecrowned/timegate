"use client";

import Label from "@/components/form/Label";
import SelectSearch from "@/components/form/SelectSearch";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import { timegateFetch } from "@/lib/timegate-api";
import type { TimeGateEmployee, TimeGateLateRecord, TimeGateListResponse } from "@/types/timegate";
import { useEffect, useMemo, useState } from "react";

export default function TimeGateLateRecordsPage() {
  const [rows, setRows] = useState<TimeGateLateRecord[]>([]);
  const [employees, setEmployees] = useState<TimeGateEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [latenessMinutes, setLatenessMinutes] = useState("5");
  const [justified, setJustified] = useState(false);
  const [reason, setReason] = useState("");

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })),
    [employees],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [lateRes, employeesRes] = await Promise.all([
        timegateFetch<TimeGateListResponse<TimeGateLateRecord>>(
          `/late-records?page=1&limit=100${employeeId ? `&employeeId=${employeeId}` : ""}`,
        ),
        timegateFetch<TimeGateListResponse<TimeGateEmployee>>("/employees?page=1&limit=100"),
      ]);
      setRows(lateRes.data);
      setEmployees(employeesRes.data);
      if (!formEmployeeId && employeesRes.data[0]?.id) setFormEmployeeId(employeesRes.data[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement des retards impossible");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [employeeId]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await timegateFetch("/late-records", {
        method: "POST",
        body: JSON.stringify({
          employeeId: formEmployeeId,
          date: new Date(date).toISOString(),
          latenessMinutes: Number(latenessMinutes),
          justified,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      });
      setOpen(false);
      setDate("");
      setLatenessMinutes("5");
      setJustified(false);
      setReason("");
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Retards</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Suivi des retards employés</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>Nouveau retard</Button>
      </div>
      {error && <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}

      <SelectSearch
        label="Filtrer par employé"
        options={[{ value: "", label: "Tous les employés" }, ...employeeOptions]}
        value={employeeId}
        onChange={setEmployeeId}
      />

      <TimeGateDataTable
        columns={[
          { key: "employee", label: "Employé" },
          { key: "date", label: "Date" },
          { key: "minutes", label: "Retard (min)" },
          { key: "status", label: "Statut" },
          { key: "reason", label: "Motif" },
        ]}
        rows={rows}
        loading={loading}
        emptyLabel="Aucun retard."
        renderRow={(r) => [
          r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId,
          new Date(r.date).toLocaleString("fr-FR"),
          String(r.latenessMinutes),
          <Badge key="status" size="sm" color={r.justified ? "success" : "warning"}>
            {r.justified ? "Justifié" : "Non justifié"}
          </Badge>,
          r.reason ?? "—",
        ]}
      />

      <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-[640px] p-5 lg:p-8">
        <form onSubmit={onCreate} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ajouter un retard</h3>
          <SelectSearch label="Employé" options={employeeOptions} value={formEmployeeId} onChange={setFormEmployeeId} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><Label>Date/heure</Label><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
            <div><Label>Minutes de retard</Label><Input type="number" min="1" value={latenessMinutes} onChange={(e) => setLatenessMinutes(e.target.value)} required /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={justified} onChange={(e) => setJustified(e.target.checked)} />
            Retard justifié
          </label>
          <div><Label>Motif</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <div className="flex justify-end"><Button size="sm" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
