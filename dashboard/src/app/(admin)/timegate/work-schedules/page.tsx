"use client";

import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Modal } from "@/components/ui/modal";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import { timegateFetch } from "@/lib/timegate-api";
import type { TimeGateListResponse, TimeGateSite, TimeGateWorkSchedule } from "@/types/timegate";
import { useEffect, useMemo, useState } from "react";

export default function WorkSchedulesPage() {
  const [rows, setRows] = useState<TimeGateWorkSchedule[]>([]);
  const [sites, setSites] = useState<TimeGateSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [siteId, setSiteId] = useState("");
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [lateGraceMinutes, setLateGraceMinutes] = useState("5");

  const siteOptions = useMemo(() => sites.map((s) => ({ value: s.id, label: s.name })), [sites]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [schedules, siteList] = await Promise.all([
        timegateFetch<TimeGateListResponse<TimeGateWorkSchedule>>("/work-schedules?page=1&limit=100"),
        timegateFetch<TimeGateListResponse<TimeGateSite>>("/sites?page=1&limit=100"),
      ]);
      setRows(schedules.data);
      setSites(siteList.data);
      if (!siteId && siteList.data[0]?.id) setSiteId(siteList.data[0].id);
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
      await timegateFetch("/work-schedules", {
        method: "POST",
        body: JSON.stringify({
          siteId,
          name: name.trim(),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          lateGraceMinutes: Number(lateGraceMinutes),
        }),
      });
      setOpen(false);
      setName("");
      setStartTime("");
      setEndTime("");
      setLateGraceMinutes("5");
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Work Schedules</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Créneaux horaires de travail</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>Nouveau schedule</Button>
      </div>
      {error && <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}
      <TimeGateDataTable
        columns={[
          { key: "name", label: "Nom" },
          { key: "site", label: "Site" },
          { key: "startTime", label: "Début" },
          { key: "endTime", label: "Fin" },
          { key: "grace", label: "Grace (min)" },
        ]}
        rows={rows}
        loading={loading}
        renderRow={(row) => [
          row.name,
          row.site?.name ?? row.siteId,
          new Date(row.startTime).toLocaleString(),
          new Date(row.endTime).toLocaleString(),
          String(row.lateGraceMinutes),
        ]}
      />

      <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-[640px] p-5 lg:p-8">
        <form onSubmit={onCreate} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Créer un work schedule</h3>
          <div>
            <Label>Site</Label>
            <Select options={siteOptions} placeholder="Sélectionner un site" value={siteId} onChange={setSiteId} />
          </div>
          <div><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div><Label>Début</Label><Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></div>
            <div><Label>Fin</Label><Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required /></div>
            <div><Label>Grace (min)</Label><Input type="number" min="0" value={lateGraceMinutes} onChange={(e) => setLateGraceMinutes(e.target.value)} /></div>
          </div>
          <div className="flex justify-end"><Button size="sm" disabled={saving}>{saving ? "Création..." : "Créer"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
