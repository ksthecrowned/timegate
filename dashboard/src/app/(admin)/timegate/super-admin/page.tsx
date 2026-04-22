"use client";

import Button from "@/components/ui/button/Button";
import { timegateFetch } from "@/lib/timegate-api";
import { useEffect, useState } from "react";

type OrgItem = {
  id: string;
  name: string;
  sku: string;
  users: { id: string; email: string; role: string; createdAt: string }[];
  subscriptions: { id: string; plan: string; maxEmployees: number; maxDevices: number; expiresAt: string | null }[];
  activationKeys: { id: string; plan: string; expiresAt: string; usedAt: string | null; revokedAt: string | null }[];
};

export default function SuperAdminPage() {
  const [rows, setRows] = useState<OrgItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState("");
  const [orgSku, setOrgSku] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [plan, setPlan] = useState("PRO");
  const [maxEmployees, setMaxEmployees] = useState("200");
  const [maxDevices, setMaxDevices] = useState("20");
  const [expiresAt, setExpiresAt] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const data = await timegateFetch<OrgItem[]>("/auth/super-admin/organizations");
      setRows(data);
      setSelectedOrgId((prev) => prev || data[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les organisations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createOrganization() {
    if (!orgName.trim() || !orgSku.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await timegateFetch("/auth/super-admin/organizations", {
        method: "POST",
        body: JSON.stringify({ name: orgName.trim(), sku: orgSku.trim().toUpperCase() }),
      });
      setOrgName("");
      setOrgSku("");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de créer l'organisation");
    } finally {
      setSubmitting(false);
    }
  }

  async function createAdmin() {
    if (!selectedOrgId || !adminEmail.trim() || !adminPassword.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await timegateFetch(`/auth/super-admin/organizations/${selectedOrgId}/admins`, {
        method: "POST",
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword }),
      });
      setAdminEmail("");
      setAdminPassword("");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de créer l'admin");
    } finally {
      setSubmitting(false);
    }
  }

  async function createActivationKey() {
    if (!selectedOrgId || !plan.trim()) return;
    setSubmitting(true);
    setError(null);
    setGeneratedKey(null);
    try {
      const data = await timegateFetch<{ activationKey: string }>(
        `/auth/super-admin/organizations/${selectedOrgId}/activation-keys`,
        {
          method: "POST",
          body: JSON.stringify({
            plan: plan.trim(),
            maxEmployees: Number(maxEmployees),
            maxDevices: Number(maxDevices),
            ...(expiresAt ? { expiresAt } : {}),
          }),
        },
      );
      setGeneratedKey(data.activationKey);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de générer la clé");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Super Admin</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Gérer les organisations, admins et clés d&apos;activation.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
          {error}
        </div>
      )}

      {generatedKey && (
        <div className="rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-200">
          Clé générée (à communiquer une seule fois) : <span className="font-mono">{generatedKey}</span>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Créer organisation</h2>
          <div className="mt-3 space-y-2">
            <input className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" placeholder="Nom organisation" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            <input className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" placeholder="SKU (ex: TMGT)" value={orgSku} onChange={(e) => setOrgSku(e.target.value)} />
            <Button size="sm" disabled={submitting} onClick={() => void createOrganization()}>
              Créer
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Créer admin organisation</h2>
          <div className="mt-3 space-y-2">
            <select className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)}>
              <option value="">Choisir organisation</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.sku})</option>
              ))}
            </select>
            <input className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" placeholder="admin@org.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            <input className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" placeholder="Mot de passe" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
            <Button size="sm" disabled={submitting} onClick={() => void createAdmin()}>
              Créer admin
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Générer clé d&apos;activation</h2>
          <div className="mt-3 space-y-2">
            <input className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" placeholder="Plan (ex: PRO)" value={plan} onChange={(e) => setPlan(e.target.value)} />
            <input className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" placeholder="Max employés" value={maxEmployees} onChange={(e) => setMaxEmployees(e.target.value)} />
            <input className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" placeholder="Max appareils" value={maxDevices} onChange={(e) => setMaxDevices(e.target.value)} />
            <input className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" placeholder="Expire le (ISO, optionnel)" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            <Button size="sm" disabled={submitting || !selectedOrgId} onClick={() => void createActivationKey()}>
              Générer
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Organisations</h2>
        {loading ? (
          <p className="mt-3 text-sm text-gray-500">Chargement...</p>
        ) : (
          <div className="mt-3 space-y-3">
            {rows.map((org) => (
              <div key={org.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {org.name} <span className="font-mono text-xs text-gray-500">({org.sku})</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Admins: {org.users.map((u) => `${u.email} [${u.role}]`).join(", ") || "Aucun"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Abonnement: {org.subscriptions[0]?.plan ?? "inactif"} / expiration: {org.subscriptions[0]?.expiresAt ?? "—"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Clés: {org.activationKeys.length}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
