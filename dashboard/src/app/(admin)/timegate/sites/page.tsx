"use client";

import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import { timegateFetch } from "@/lib/timegate-api";
import type { TimeGateListResponse, TimeGateSite } from "@/types/timegate";
import { useEffect, useState } from "react";

export default function TimeGateSitesPage() {
  const [sites, setSites] = useState<TimeGateSite[]>([]);
  const [meta, setMeta] = useState<TimeGateListResponse<TimeGateSite>["meta"] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<TimeGateSite | null>(null);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [address, setAddress] = useState("");

  async function loadSites() {
    setLoading(true);
    setError(null);
    try {
      const res = await timegateFetch<TimeGateListResponse<TimeGateSite>>(
        "/sites?page=1&limit=100",
      );
      setSites(res.data);
      setMeta(res.meta);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible de charger les sites",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadSites();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setName("");
    setTimezone("UTC");
    setAddress("");
    setFormError(null);
    setEditingSite(null);
  }

  function openCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function openEdit(site: TimeGateSite) {
    setFormError(null);
    setEditingSite(site);
    setName(site.name);
    setTimezone(site.timezone ?? "UTC");
    setAddress(site.address ?? "");
    setEditOpen(true);
  }

  function closeModals() {
    setCreateOpen(false);
    setEditOpen(false);
    resetForm();
  }

  async function onCreateSite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await timegateFetch("/sites", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          timezone: timezone.trim() || "UTC",
          ...(address.trim() ? { address: address.trim() } : {}),
        }),
      });
      closeModals();
      await loadSites();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Impossible de créer le site",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingSite) return;
    setSaving(true);
    setFormError(null);
    try {
      await timegateFetch(`/sites/${editingSite.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          timezone: timezone.trim() || "UTC",
          ...(address.trim() ? { address: address.trim() } : { address: null }),
        }),
      });
      closeModals();
      await loadSites();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Impossible de mettre à jour le site",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Sites
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {meta != null
            ? `${meta.total} site(s) — page ${meta.page} / ${meta.totalPages}`
            : loading
              ? "Chargement…"
              : ""}
        </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          Nouveau site
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
          {error}
        </div>
      )}

      <TimeGateDataTable
        columns={[
          { key: "name", label: "Nom" },
          { key: "timezone", label: "Fuseau" },
          { key: "address", label: "Adresse" },
          { key: "actions", label: "Actions" },
        ]}
        rows={sites}
        loading={loading}
        emptyLabel="Aucun site."
        renderRow={(s) => [
          <span className="font-medium text-gray-900 dark:text-white" key="name">{s.name}</span>,
          s.timezone ?? "UTC",
          s.address ?? "—",
          <Button key="edit" size="sm" variant="outline" onClick={() => openEdit(s)}>
            Modifier
          </Button>,
        ]}
      />

      <Modal isOpen={createOpen} onClose={closeModals} className="max-w-[560px] p-5 lg:p-8">
        <form onSubmit={onCreateSite}>
          <h3 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
            Créer un site
          </h3>
          {formError && (
            <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
              {formError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="site-name-create">Nom</Label>
              <Input
                id="site-name-create"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                placeholder="Headquarters"
              />
            </div>
            <div>
              <Label htmlFor="site-timezone-create">Fuseau horaire</Label>
              <Input
                id="site-timezone-create"
                value={timezone}
                onChange={(ev) => setTimezone(ev.target.value)}
                placeholder="Africa/Lagos"
              />
            </div>
            <div>
              <Label htmlFor="site-address-create">Adresse</Label>
              <Input
                id="site-address-create"
                value={address}
                onChange={(ev) => setAddress(ev.target.value)}
                placeholder="100 Main St"
              />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeModals}
              className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/5"
            >
              Annuler
            </button>
            <Button size="sm" disabled={saving}>
              {saving ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={editOpen} onClose={closeModals} className="max-w-[560px] p-5 lg:p-8">
        <form onSubmit={onSaveEdit}>
          <h3 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
            Modifier le site
          </h3>
          {formError && (
            <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
              {formError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="site-name-edit">Nom</Label>
              <Input
                id="site-name-edit"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="site-timezone-edit">Fuseau horaire</Label>
              <Input
                id="site-timezone-edit"
                value={timezone}
                onChange={(ev) => setTimezone(ev.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="site-address-edit">Adresse</Label>
              <Input
                id="site-address-edit"
                value={address}
                onChange={(ev) => setAddress(ev.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeModals}
              className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/5"
            >
              Annuler
            </button>
            <Button size="sm" disabled={saving}>
              {saving ? "Mise à jour..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
