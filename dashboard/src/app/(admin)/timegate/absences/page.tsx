"use client";

import Label from "@/components/form/Label";
import SelectSearch from "@/components/form/SelectSearch";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import { timegateFetch } from "@/lib/timegate-api";
import type { TimeGateAbsenceRecord, TimeGateEmployee, TimeGateListResponse } from "@/types/timegate";
import { useEffect, useMemo, useState } from "react";

export default function TimeGateAbsencesPage() {
  const [rows, setRows] = useState<TimeGateAbsenceRecord[]>([]);
  const [employees, setEmployees] = useState<TimeGateEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [date, setDate] = useState("");
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
      const [absenceRes, employeesRes] = await Promise.all([
        timegateFetch<TimeGateListResponse<TimeGateAbsenceRecord>>(
          `/absences?page=1&limit=100${employeeId ? `&employeeId=${employeeId}` : ""}`,
        ),
        timegateFetch<TimeGateListResponse<TimeGateEmployee>>("/employees?page=1&limit=100"),
      ]);
      setRows(absenceRes.data);
      setEmployees(employeesRes.data);
      if (!formEmployeeId && employeesRes.data[0]?.id) setFormEmployeeId(employeesRes.data[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement des absences impossible");
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
      await timegateFetch("/absences", {
        method: "POST",
        body: JSON.stringify({
          employeeId: formEmployeeId,
          date: new Date(date).toISOString(),
          justified,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      });
      setOpen(false);
      setDate("");
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Absences</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Suivi des absences justifiées/non justifiées</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>Nouvelle absence</Button>
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
          { key: "status", label: "Statut" },
          { key: "reason", label: "Motif" },
        ]}
        rows={rows}
        loading={loading}
        emptyLabel="Aucune absence."
        renderRow={(r) => [
          r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId,
          new Date(r.date).toLocaleDateString("fr-FR"),
          <Badge key="status" size="sm" color={r.justified ? "success" : "error"}>
            {r.justified ? "Justifiée" : "Non justifiée"}
          </Badge>,
          r.reason ?? "—",
        ]}
      />

      <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-[640px] p-5 lg:p-8">
        <form onSubmit={onCreate} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ajouter une absence</h3>
          <SelectSearch label="Employé" options={employeeOptions} value={formEmployeeId} onChange={setFormEmployeeId} />
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={justified} onChange={(e) => setJustified(e.target.checked)} />
            Absence justifiée
          </label>
          <div><Label>Motif</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <div className="flex justify-end"><Button size="sm" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
