"use client";

import Button from "@/components/ui/button/Button";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import { timegateFetch } from "@/lib/timegate-api";
import type {
  TimeGateEmployee,
  TimeGateListResponse,
  TimeGateSite,
} from "@/types/timegate";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function TimeGateEmployeesPage() {
  const [rows, setRows] = useState<TimeGateEmployee[]>([]);
  const [sites, setSites] = useState<TimeGateSite[]>([]);
  const [meta, setMeta] =
    useState<TimeGateListResponse<TimeGateEmployee>["meta"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadEmployees() {
    setLoading(true);
    setError(null);
    try {
      const [employeesRes, sitesRes] = await Promise.all([
        timegateFetch<TimeGateListResponse<TimeGateEmployee>>(
          "/employees?page=1&limit=100",
        ),
        timegateFetch<TimeGateListResponse<TimeGateSite>>(
          "/sites?page=1&limit=100",
        ),
      ]);
      setRows(employeesRes.data);
      setMeta(employeesRes.meta);
      setSites(sitesRes.data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible de charger les employés",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadEmployees();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const siteNameById = new Map(sites.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Employés
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {meta != null
            ? `${meta.total} employé(s) — page ${meta.page} / ${meta.totalPages}`
            : loading
              ? "Chargement…"
              : ""}
        </p>
        </div>
        <Link href="/timegate/employees/new">
          <Button size="sm">Nouvel employé</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
          {error}
        </div>
      )}

      <TimeGateDataTable
        columns={[
          { key: "name", label: "Nom" },
          { key: "code", label: "Code" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Téléphone" },
          { key: "birthDate", label: "Anniversaire" },
          { key: "whatsapp", label: "WhatsApp" },
          { key: "site", label: "Site" },
          { key: "schedule", label: "Planning" },
          { key: "face", label: "Face" },
          { key: "actions", label: "Actions" },
        ]}
        rows={rows}
        loading={loading}
        emptyLabel="Aucun employé."
        renderRow={(r) => [
          <Link key="name" href={`/timegate/employees/${r.id}`} className="font-medium text-gray-900 hover:text-brand-500 dark:text-white">
            {r.firstName} {r.lastName}
          </Link>,
          r.employeeCode ?? "—",
          r.email ?? "—",
          r.phone ?? "—",
          r.birthDate ? new Date(r.birthDate).toLocaleDateString("fr-FR") : "—",
          r.whatsappPhone ?? "—",
          r.siteId ? (siteNameById.get(r.siteId) ?? r.siteId) : "—",
          r.schedule?.name ?? "Fallback site",
          r.hasFaceEmbedding ? "Enrollé" : "Non enrôlé",
          <div key="actions" className="flex flex-wrap gap-2">
            <Link href={`/timegate/employees/${r.id}`}>
              <Button size="sm" variant="outline">Fiche</Button>
            </Link>
            <Link href={`/timegate/employees/${r.id}/edit`}>
              <Button size="sm" variant="outline">Modifier</Button>
            </Link>
          </div>,
        ]}
      />
    </div>
  );
}
