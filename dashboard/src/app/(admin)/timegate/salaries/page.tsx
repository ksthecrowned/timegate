"use client";

import Label from "@/components/form/Label";
import SelectSearch from "@/components/form/SelectSearch";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import { timegateFetch } from "@/lib/timegate-api";
import type { TimeGateEmployee, TimeGateListResponse, TimeGateSalaryRecord } from "@/types/timegate";
import { useEffect, useMemo, useState } from "react";

export default function TimeGateSalariesPage() {
  const [rows, setRows] = useState<TimeGateSalaryRecord[]>([]);
  const [employees, setEmployees] = useState<TimeGateEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [baseSalary, setBaseSalary] = useState("");
  const [bonuses, setBonuses] = useState("0");
  const [deductions, setDeductions] = useState("0");
  const [notes, setNotes] = useState("");

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })),
    [employees],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [salaryRes, employeesRes] = await Promise.all([
        timegateFetch<TimeGateListResponse<TimeGateSalaryRecord>>(
          `/salaries?page=1&limit=100${employeeId ? `&employeeId=${employeeId}` : ""}`,
        ),
        timegateFetch<TimeGateListResponse<TimeGateEmployee>>("/employees?page=1&limit=100"),
      ]);
      setRows(salaryRes.data);
      setEmployees(employeesRes.data);
      if (!formEmployeeId && employeesRes.data[0]?.id) setFormEmployeeId(employeesRes.data[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement des salaires impossible");
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
      await timegateFetch("/salaries", {
        method: "POST",
        body: JSON.stringify({
          employeeId: formEmployeeId,
          year: Number(year),
          month: Number(month),
          baseSalary: Number(baseSalary),
          bonuses: Number(bonuses || "0"),
          deductions: Number(deductions || "0"),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      });
      setOpen(false);
      setBaseSalary("");
      setBonuses("0");
      setDeductions("0");
      setNotes("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(id: string) {
    setError(null);
    try {
      await timegateFetch(`/salaries/${id}/mark-paid`, { method: "PATCH" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mise à jour impossible");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Salaires</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestion de la paie des employés</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>Nouveau salaire</Button>
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
          { key: "period", label: "Période" },
          { key: "base", label: "Base" },
          { key: "net", label: "Net" },
          { key: "status", label: "Statut" },
          { key: "actions", label: "Actions" },
        ]}
        rows={rows}
        loading={loading}
        emptyLabel="Aucun salaire."
        renderRow={(r) => [
          r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId,
          `${String(r.month).padStart(2, "0")}/${r.year}`,
          r.baseSalary.toFixed(2),
          r.netSalary.toFixed(2),
          <Badge key="status" size="sm" color={r.status === "PAID" ? "success" : "warning"}>
            {r.status === "PAID" ? "Payé" : "En attente"}
          </Badge>,
          r.status === "PAID" ? "—" : (
            <Button key="pay" size="sm" variant="outline" onClick={() => void markPaid(r.id)}>
              Marquer payé
            </Button>
          ),
        ]}
      />

      <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-[640px] p-5 lg:p-8">
        <form onSubmit={onCreate} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ajouter un salaire</h3>
          <SelectSearch label="Employé" options={employeeOptions} value={formEmployeeId} onChange={setFormEmployeeId} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><Label>Année</Label><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} required /></div>
            <div><Label>Mois</Label><Input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} required /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div><Label>Salaire de base</Label><Input type="number" min="0" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} required /></div>
            <div><Label>Primes</Label><Input type="number" value={bonuses} onChange={(e) => setBonuses(e.target.value)} /></div>
            <div><Label>Retenues</Label><Input type="number" value={deductions} onChange={(e) => setDeductions(e.target.value)} /></div>
          </div>
          <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="flex justify-end"><Button size="sm" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
