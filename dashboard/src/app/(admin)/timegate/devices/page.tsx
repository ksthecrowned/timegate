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
  TimeGateDeviceStatus,
  TimeGateListResponse,
  TimeGateSite,
} from "@/types/timegate";
import { useEffect, useMemo, useState } from "react";

type DeviceDetails = TimeGateDevice & { apiKey?: string };
const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("fr-FR") : "—";
const deviceStatusLabel = (status: TimeGateDeviceStatus) =>
  status === "ONLINE" ? "En ligne" : "Hors ligne";

export default function TimeGateDevicesPage() {
  const [rows, setRows] = useState<TimeGateDevice[]>([]);
  const [sites, setSites] = useState<TimeGateSite[]>([]);
  const [meta, setMeta] =
    useState<TimeGateListResponse<TimeGateDevice>["meta"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editing, setEditing] = useState<TimeGateDevice | null>(null);
  const [details, setDetails] = useState<DeviceDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | TimeGateDeviceStatus>("");
  const [siteFilter, setSiteFilter] = useState("");
  const [name, setName] = useState("");
  const [siteId, setSiteId] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<TimeGateDeviceStatus>("OFFLINE");

  const siteNameById = useMemo(
    () => new Map(sites.map((site) => [site.id, site.name])),
    [sites],
  );
  const siteOptions = useMemo(
    () => sites.map((site) => ({ value: site.id, label: site.name })),
    [sites],
  );
  const statusOptions = useMemo(
    () => [
      { value: "ONLINE", label: "En ligne" },
      { value: "OFFLINE", label: "Hors ligne" },
    ],
    [],
  );

  function resetForm() {
    setName("");
    setSiteId(sites[0]?.id ?? "");
    setLocation("");
    setStatus("OFFLINE");
    setEditing(null);
  }

  async function loadSites() {
    const res = await timegateFetch<TimeGateListResponse<TimeGateSite>>(
      "/sites?page=1&limit=100",
    );
    setSites(res.data);
    if (!siteId && res.data[0]?.id) {
      setSiteId(res.data[0].id);
    }
  }

  async function loadRows() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: "1", limit: "100" });
      if (siteFilter) params.set("siteId", siteFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await timegateFetch<TimeGateListResponse<TimeGateDevice>>(
        `/devices?${params.toString()}`,
      );
      setRows(res.data);
      setMeta(res.meta);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible de charger les appareils",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadSites();
        await loadRows();
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Impossible de charger les appareils",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadRows();
  }, [siteFilter, statusFilter]);

  async function openDetails(deviceId: string) {
    try {
      const data = await timegateFetch<DeviceDetails>(`/devices/${deviceId}`);
      setDetails(data);
      setDetailsOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger le détail");
    }
  }

  function openCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function openEdit(device: TimeGateDevice) {
    setEditing(device);
    setName(device.name);
    setSiteId(device.siteId);
    setLocation(device.location ?? "");
    setStatus(device.status);
    setEditOpen(true);
  }

  function closeModals() {
    setCreateOpen(false);
    setEditOpen(false);
    setDetailsOpen(false);
    resetForm();
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await timegateFetch("/devices", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          siteId,
          ...(location.trim() ? { location: location.trim() } : {}),
        }),
      });
      closeModals();
      await loadRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de créer l'appareil");
    } finally {
      setSaving(false);
    }
  }

  async function onEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await timegateFetch(`/devices/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          siteId,
          status,
          ...(location.trim() ? { location: location.trim() } : { location: null }),
        }),
      });
      closeModals();
      await loadRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de modifier l'appareil");
    } finally {
      setSaving(false);
    }
  }

  async function heartbeat(deviceId: string) {
    setError(null);
    try {
      await timegateFetch(`/devices/${deviceId}/heartbeat`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ONLINE" }),
      });
      await loadRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ping impossible");
    }
  }

  async function removeDevice(deviceId: string) {
    if (!window.confirm("Supprimer cet appareil ?")) return;
    setError(null);
    try {
      await timegateFetch(`/devices/${deviceId}`, { method: "DELETE" });
      await loadRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suppression impossible");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Appareils
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {meta != null
            ? `${meta.total} appareil(s) — page ${meta.page} / ${meta.totalPages}`
            : loading
              ? "Chargement…"
              : ""}
        </p>
        </div>
        <Button size="sm" onClick={openCreate}>Nouvel appareil</Button>
      </div>

      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
          {error}
        </div>
      )}

      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3 md:grid-cols-3">
        <div>
          <Label>Filtre site</Label>
          <Select
            options={[{ value: "", label: "Tous les sites" }, ...siteOptions]}
            placeholder="Filtrer par site"
            value={siteFilter}
            onChange={(value) => setSiteFilter(value)}
          />
        </div>
        <div>
          <Label>Filtre statut</Label>
          <Select
            options={[{ value: "", label: "Tous" }, ...statusOptions]}
            placeholder="Filtrer par statut"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as "" | TimeGateDeviceStatus)}
          />
        </div>
      </div>

      <TimeGateDataTable
        columns={[
          { key: "name", label: "Nom" },
          { key: "site", label: "Site" },
          { key: "status", label: "Statut" },
          { key: "lastSeen", label: "Dernière activité" },
          { key: "actions", label: "Actions", className: "w-[260px]" },
        ]}
        rows={rows}
        loading={loading}
        emptyLabel="Aucun appareil."
        renderRow={(r) => [
          <span key="name" className="font-medium text-gray-900 dark:text-white">
            {r.name}
            {r.location ? <span className="mt-0.5 block text-xs font-normal text-gray-500">{r.location}</span> : null}
          </span>,
          r.site?.name ?? siteNameById.get(r.siteId) ?? r.siteId,
          <Badge key="status" size="sm" color={r.status === "ONLINE" ? "success" : "warning"}>
            {deviceStatusLabel(r.status)}
          </Badge>,
          formatDateTime(r.lastSeenAt),
          <div key="actions" className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void openDetails(r.id)}>Détail</Button>
            <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Modifier</Button>
            <Button size="sm" variant="outline" onClick={() => void heartbeat(r.id)}>Ping</Button>
            <Button size="sm" variant="outline" onClick={() => void removeDevice(r.id)}>Supprimer</Button>
          </div>,
        ]}
      />

      <Modal isOpen={createOpen} onClose={closeModals} className="max-w-[560px] p-5 lg:p-8">
        <form onSubmit={onCreate} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Créer un appareil</h3>
          <div>
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Site</Label>
            <Select
              options={siteOptions}
              placeholder="Sélectionner un site"
              value={siteId}
              onChange={setSiteId}
            />
          </div>
          <div>
            <Label>Localisation</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button size="sm" disabled={saving}>{saving ? "Création..." : "Créer"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={editOpen} onClose={closeModals} className="max-w-[560px] p-5 lg:p-8">
        <form onSubmit={onEdit} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Modifier l'appareil</h3>
          <div>
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Site</Label>
            <Select
              options={siteOptions}
              placeholder="Sélectionner un site"
              value={siteId}
              onChange={setSiteId}
            />
          </div>
          <div>
            <Label>Statut</Label>
            <Select
              options={statusOptions}
              placeholder="Sélectionner un statut"
              value={status}
              onChange={(value) => setStatus(value as TimeGateDeviceStatus)}
            />
          </div>
          <div>
            <Label>Localisation</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button size="sm" disabled={saving}>{saving ? "Sauvegarde..." : "Enregistrer"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={detailsOpen} onClose={closeModals} className="max-w-[560px] p-5 lg:p-8">
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Détails appareil</h3>
          <p><span className="font-medium">Nom:</span> {details?.name ?? "—"}</p>
          <p><span className="font-medium">Site:</span> {details?.site?.name ?? "—"}</p>
          <p><span className="font-medium">Statut:</span> {details?.status ? deviceStatusLabel(details.status) : "—"}</p>
          <p><span className="font-medium">Localisation:</span> {details?.location ?? "—"}</p>
          <p><span className="font-medium">Clé API:</span> {details?.apiKey ?? "—"}</p>
          <p><span className="font-medium">Dernière activité:</span> {formatDateTime(details?.lastSeenAt)}</p>
        </div>
      </Modal>
    </div>
  );
}
