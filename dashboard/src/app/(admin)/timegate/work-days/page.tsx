"use client";

import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import SelectSearch from "@/components/form/SelectSearch";
import { Modal } from "@/components/ui/modal";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import { timegateFetch } from "@/lib/timegate-api";
import type { TimeGateListResponse, TimeGateWeekDay, TimeGateWorkDay, TimeGateWorkSchedule } from "@/types/timegate";
import { useEffect, useMemo, useState } from "react";

export default function WorkDaysPage() {
  const [rows, setRows] = useState<TimeGateWorkDay[]>([]);
  const [schedules, setSchedules] = useState<TimeGateWorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduleId, setScheduleId] = useState("");
  const [day, setDay] = useState<TimeGateWeekDay>("MONDAY");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");

  const scheduleOptions = useMemo(
    () => schedules.map((s) => ({ value: s.id, label: `${s.name} (${s.site?.name ?? s.siteId})` })),
    [schedules],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [days, ws] = await Promise.all([
        timegateFetch<TimeGateListResponse<TimeGateWorkDay>>("/work-days?page=1&limit=100"),
        timegateFetch<TimeGateListResponse<TimeGateWorkSchedule>>("/work-schedules?page=1&limit=100"),
      ]);
      setRows(days.data);
      setSchedules(ws.data);
      if (!scheduleId && ws.data[0]?.id) setScheduleId(ws.data[0].id);
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
      await timegateFetch("/work-days", {
        method: "POST",
        body: JSON.stringify({ scheduleId, day, startTime, endTime }),
      });
      setOpen(false);
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Work Days</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Jours de travail hebdomadaire</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>Nouveau work day</Button>
      </div>
      {error && <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}
      <TimeGateDataTable
        columns={[
          { key: "schedule", label: "Schedule" },
          { key: "day", label: "Jour" },
          { key: "startTime", label: "Début" },
          { key: "endTime", label: "Fin" },
        ]}
        rows={rows}
        loading={loading}
        renderRow={(r) => [r.schedule?.name ?? r.scheduleId, r.day, r.startTime, r.endTime]}
      />

      <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-[640px] p-5 lg:p-8">
        <form onSubmit={onCreate} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Créer un WorkDay</h3>
          <SelectSearch label="Schedule" options={scheduleOptions} value={scheduleId} onChange={setScheduleId} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label>Jour</Label>
              <Select
                options={[
                  { value: "MONDAY", label: "MONDAY" },
                  { value: "TUESDAY", label: "TUESDAY" },
                  { value: "WEDNESDAY", label: "WEDNESDAY" },
                  { value: "THURSDAY", label: "THURSDAY" },
                  { value: "FRIDAY", label: "FRIDAY" },
                  { value: "SATURDAY", label: "SATURDAY" },
                  { value: "SUNDAY", label: "SUNDAY" },
                ]}
                value={day}
                onChange={(v) => setDay(v as TimeGateWeekDay)}
              />
            </div>
            <div><Label>Début</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div><Label>Fin</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          </div>
          <div className="flex justify-end"><Button size="sm" disabled={saving}>{saving ? "Création..." : "Créer"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
