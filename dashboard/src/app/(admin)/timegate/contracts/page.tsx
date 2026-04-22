"use client";

import Label from "@/components/form/Label";
import SelectSearch from "@/components/form/SelectSearch";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import { timegateFetch } from "@/lib/timegate-api";
import type {
  TimeGateEmployee,
  TimeGateEmployeeContract,
  TimeGateListResponse,
} from "@/types/timegate";
import { useEffect, useMemo, useState } from "react";

export default function TimeGateContractsPage() {
  const [rows, setRows] = useState<TimeGateEmployeeContract[]>([]);
  const [employees, setEmployees] = useState<TimeGateEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [signedAt, setSignedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [renewalsCount, setRenewalsCount] = useState("0");
  const [notes, setNotes] = useState("");
  const [contractFile, setContractFile] = useState<File | null>(null);

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: `${e.firstName} ${e.lastName}${e.employeeCode ? ` (${e.employeeCode})` : ""}`,
      })),
    [employees],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [contractsRes, employeesRes] = await Promise.all([
        timegateFetch<TimeGateListResponse<TimeGateEmployeeContract>>(
          `/employees/contracts?page=1&limit=100${employeeId ? `&employeeId=${employeeId}` : ""}`,
        ),
        timegateFetch<TimeGateListResponse<TimeGateEmployee>>("/employees?page=1&limit=100"),
      ]);
      setRows(contractsRes.data);
      setEmployees(employeesRes.data);
      if (!formEmployeeId && employeesRes.data[0]?.id) {
        setFormEmployeeId(employeesRes.data[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les contrats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [employeeId]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formEmployeeId) return;
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("signedAt", new Date(signedAt).toISOString());
      if (expiresAt) form.append("expiresAt", new Date(expiresAt).toISOString());
      form.append("renewalsCount", renewalsCount || "0");
      if (notes.trim()) form.append("notes", notes.trim());
      if (contractFile) form.append("contractFile", contractFile);
      await timegateFetch(`/employees/${formEmployeeId}/contracts`, {
        method: "POST",
        body: form,
      });
      setOpen(false);
      setSignedAt("");
      setExpiresAt("");
      setRenewalsCount("0");
      setNotes("");
      setContractFile(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création du contrat impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Contrats employés</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Historique des signatures, expirations et renouvellements.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          Nouveau contrat
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
        <SelectSearch
          label="Filtrer par employé"
          options={[{ value: "", label: "Tous les employés" }, ...employeeOptions]}
          value={employeeId}
          onChange={setEmployeeId}
        />
      </div>

      <TimeGateDataTable
        columns={[
          { key: "employee", label: "Employé" },
          { key: "current", label: "Version active" },
          { key: "signedAt", label: "Date signature" },
          { key: "expiresAt", label: "Date expiration" },
          { key: "renewals", label: "Renouvellements" },
          { key: "file", label: "Fichier" },
        ]}
        rows={rows}
        loading={loading}
        emptyLabel="Aucun contrat."
        renderRow={(r) => [
          r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId,
          <Badge key="current" size="sm" color={r.isCurrent ? "success" : "light"}>
            {r.isCurrent ? "Actif" : "Ancien"}
          </Badge>,
          new Date(r.signedAt).toLocaleDateString("fr-FR"),
          r.expiresAt ? new Date(r.expiresAt).toLocaleDateString("fr-FR") : "—",
          String(r.renewalsCount),
          r.contractFileUrl ? (
            <a
              key="file"
              href={r.contractFileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand-500"
            >
              Ouvrir
            </a>
          ) : (
            "—"
          ),
        ]}
      />

      <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-[640px] p-5 lg:p-8">
        <form onSubmit={onCreate} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ajouter un contrat</h3>
          <SelectSearch
            label="Employé"
            options={employeeOptions}
            value={formEmployeeId}
            onChange={setFormEmployeeId}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Date de signature</Label>
              <Input
                type="date"
                value={signedAt}
                onChange={(e) => setSignedAt(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Date d'expiration</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Nombre de renouvellements</Label>
            <Input
              type="number"
              min="0"
              value={renewalsCount}
              onChange={(e) => setRenewalsCount(e.target.value)}
            />
          </div>
          <div>
            <Label>Fichier contrat</Label>
            <Input type="file" onChange={(e) => setContractFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Commentaires..." />
          </div>
          <div className="flex justify-end">
            <Button size="sm" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
