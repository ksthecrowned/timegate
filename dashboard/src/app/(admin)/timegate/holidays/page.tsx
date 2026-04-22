"use client";

import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import SelectSearch from "@/components/form/SelectSearch";
import { Modal } from "@/components/ui/modal";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import { timegateFetch } from "@/lib/timegate-api";
import type { TimeGateHoliday, TimeGateListResponse } from "@/types/timegate";
import { useEffect, useMemo, useState } from "react";

type OrgOption = { value: string; label: string };

export default function HolidaysPage() {
  const [rows, setRows] = useState<TimeGateHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [organizationId, setOrganizationId] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  const orgOptions = useMemo<OrgOption[]>(
    () =>
      Array.from(
        new Map(
          rows
            .filter((h) => h.organization)
            .map((h) => [h.organization!.id, `${h.organization!.name} (${h.organization!.sku})`]),
        ),
      ).map(([value, label]) => ({ value, label })),
    [rows],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await timegateFetch<TimeGateListResponse<TimeGateHoliday>>("/holidays?page=1&limit=100");
      setRows(res.data);
      if (!organizationId && res.data[0]?.organizationId) setOrganizationId(res.data[0].organizationId);
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
      await timegateFetch("/holidays", {
        method: "POST",
        body: JSON.stringify({
          organizationId,
          name: name.trim(),
          date: new Date(date).toISOString(),
        }),
      });
      setOpen(false);
      setName("");
      setDate("");
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Holidays</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Jours fériés organisation</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>Nouveau jour férié</Button>
      </div>
      {error && <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}
      <TimeGateDataTable
        columns={[
          { key: "organization", label: "Organisation" },
          { key: "name", label: "Nom" },
          { key: "date", label: "Date" },
        ]}
        rows={rows}
        loading={loading}
        renderRow={(r) => [
          r.organization?.name ?? r.organizationId,
          r.name,
          new Date(r.date).toLocaleDateString(),
        ]}
      />

      <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-[640px] p-5 lg:p-8">
        <form onSubmit={onCreate} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Créer un jour férié</h3>
          <SelectSearch label="Organisation" options={orgOptions} value={organizationId} onChange={setOrganizationId} />
          <div><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          <div className="flex justify-end"><Button size="sm" disabled={saving}>{saving ? "Création..." : "Créer"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
