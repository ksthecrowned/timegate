"use client";

import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import { timegateFetch } from "@/lib/timegate-api";
import type {
  TimeGateDevice,
  TimeGateEmployee,
  TimeGateListResponse,
  TimeGateRecognitionLog,
  TimeGateSite,
} from "@/types/timegate";
import { useEffect, useMemo, useState } from "react";

const formatDateTime = (value: string) => new Date(value).toLocaleString("fr-FR");

export default function TimeGateLogsPage() {
  const [rows, setRows] = useState<TimeGateRecognitionLog[]>([]);
  const [meta, setMeta] =
    useState<TimeGateListResponse<TimeGateRecognitionLog>["meta"] | null>(null);
  const [sites, setSites] = useState<TimeGateSite[]>([]);
  const [devices, setDevices] = useState<TimeGateDevice[]>([]);
  const [employees, setEmployees] = useState<TimeGateEmployee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [siteId, setSiteId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formDeviceId, setFormDeviceId] = useState("");
  const [formSuccess, setFormSuccess] = useState(true);
  const [formConfidence, setFormConfidence] = useState("0.9");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");

  const filteredEmployees = useMemo(
    () =>
      employees.filter((emp) =>
        `${emp.firstName} ${emp.lastName}`
          .toLowerCase()
          .includes(employeeSearch.toLowerCase()),
      ),
    [employees, employeeSearch],
  );
  const filteredDevices = useMemo(
    () =>
      devices.filter((dev) =>
        dev.name.toLowerCase().includes(deviceSearch.toLowerCase()),
      ),
    [devices, deviceSearch],
  );
  const siteOptions = useMemo(
    () => sites.map((site) => ({ value: site.id, label: site.name })),
    [sites],
  );
  const employeeOptions = useMemo(
    () =>
      filteredEmployees.map((emp) => ({
        value: emp.id,
        label: `${emp.firstName} ${emp.lastName}`,
      })),
    [filteredEmployees],
  );
  const deviceOptions = useMemo(
    () => filteredDevices.map((dev) => ({ value: dev.id, label: dev.name })),
    [filteredDevices],
  );

  async function loadDependencies() {
    const [siteRes, employeeRes, deviceRes] = await Promise.all([
      timegateFetch<TimeGateListResponse<TimeGateSite>>("/sites?page=1&limit=100"),
      timegateFetch<TimeGateListResponse<TimeGateEmployee>>("/employees?page=1&limit=100"),
      timegateFetch<TimeGateListResponse<TimeGateDevice>>("/devices?page=1&limit=100"),
    ]);
    setSites(siteRes.data);
    setEmployees(employeeRes.data);
    setDevices(deviceRes.data);
    if (!formEmployeeId && employeeRes.data[0]?.id) setFormEmployeeId(employeeRes.data[0].id);
    if (!formDeviceId && deviceRes.data[0]?.id) setFormDeviceId(deviceRes.data[0].id);
  }

  async function loadRows() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: "1", limit: "100" });
      if (siteId) params.set("siteId", siteId);
      if (employeeId) params.set("employeeId", employeeId);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());
      const res = await timegateFetch<TimeGateListResponse<TimeGateRecognitionLog>>(
        `/logs?${params.toString()}`,
      );
      setRows(res.data);
      setMeta(res.meta);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible de charger les logs",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await loadDependencies();
        await loadRows();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      }
    })();
  }, []);

  useEffect(() => {
    void loadRows();
  }, [siteId, employeeId, from, to]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await timegateFetch("/logs", {
        method: "POST",
        body: JSON.stringify({
          deviceId: formDeviceId,
          success: formSuccess,
          ...(formEmployeeId ? { employeeId: formEmployeeId } : {}),
          ...(formConfidence ? { confidence: Number(formConfidence) } : {}),
          ...(formImageUrl.trim() ? { imageUrl: formImageUrl.trim() } : {}),
        }),
      });
      setCreateOpen(false);
      await loadRows();
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
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Journaux de reconnaissance
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {meta != null
            ? `${meta.total} entrée(s) — page ${meta.page} / ${meta.totalPages}`
            : loading
              ? "Chargement…"
              : ""}
        </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>Nouveau log</Button>
      </div>

      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
          {error}
        </div>
      )}

      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3 md:grid-cols-4">
        <div>
          <Label>Site</Label>
          <Select
            options={[{ value: "", label: "Tous" }, ...siteOptions]}
            placeholder="Tous les sites"
            value={siteId}
            onChange={setSiteId}
          />
        </div>
        <div>
          <Label>Employé</Label>
          <Select
            options={[{ value: "", label: "Tous" }, ...employeeOptions]}
            placeholder="Tous les employés"
            value={employeeId}
            onChange={setEmployeeId}
          />
        </div>
        <div>
          <Label>Du</Label>
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>Au</Label>
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <TimeGateDataTable
        columns={[
          { key: "result", label: "Résultat" },
          { key: "date", label: "Date" },
          { key: "employee", label: "Employé" },
          { key: "device", label: "Appareil" },
          { key: "confidence", label: "Confiance" },
          { key: "image", label: "Image" },
        ]}
        rows={rows}
        loading={loading}
        emptyLabel="Aucun journal."
        renderRow={(r) => [
          <Badge key="result" size="sm" color={r.success ? "success" : "error"}>
            {r.success ? "Réussi" : "Échec"}
          </Badge>,
          formatDateTime(r.createdAt),
          r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId ?? "—",
          r.device?.name ?? r.deviceId,
          r.confidence != null ? r.confidence.toFixed(3) : "—",
          r.imageUrl ? (
            <a
              key="image"
              href={r.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2"
            >
              <img
                src={r.imageUrl}
                alt="Capture reconnaissance"
                className="h-10 w-10 rounded object-cover ring-1 ring-gray-200 dark:ring-gray-700"
              />
              <span className="text-brand-500">Voir</span>
            </a>
          ) : "—",
        ]}
      />

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} className="max-w-[640px] p-5 lg:p-8">
        <form onSubmit={onCreate} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Créer un log de reconnaissance</h3>
          <div>
            <Label>Recherche appareil</Label>
            <Input value={deviceSearch} onChange={(e) => setDeviceSearch(e.target.value)} placeholder="Nom appareil..." />
          </div>
          <div>
            <Label>Appareil</Label>
            <Select
              options={deviceOptions}
              placeholder="Sélectionner un appareil"
              value={formDeviceId}
              onChange={setFormDeviceId}
            />
          </div>
          <div>
            <Label>Recherche employé</Label>
            <Input value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} placeholder="Nom employé..." />
          </div>
          <div>
            <Label>Employé (optionnel)</Label>
            <Select
              options={[{ value: "", label: "Aucun" }, ...employeeOptions]}
              placeholder="Sélectionner un employé"
              value={formEmployeeId}
              onChange={setFormEmployeeId}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label>Résultat</Label>
              <Select
                options={[
                  { value: "success", label: "Réussi" },
                  { value: "fail", label: "Échec" },
                ]}
                placeholder="Résultat"
                value={formSuccess ? "success" : "fail"}
                onChange={(value) => setFormSuccess(value === "success")}
              />
            </div>
            <div>
              <Label>Confiance (0-1)</Label>
              <Input type="number" min="0" max="1" step={0.01} value={formConfidence} onChange={(e) => setFormConfidence(e.target.value)} />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" disabled={saving}>{saving ? "Création..." : "Créer"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
