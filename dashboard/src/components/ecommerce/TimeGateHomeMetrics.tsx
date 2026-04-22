"use client";

import { timegateFetch } from "@/lib/timegate-api";
import type { TimeGateListResponse } from "@/types/timegate";
import { useEffect, useMemo, useState } from "react";
import { EcommerceMetrics } from "./EcommerceMetrics";

export default function TimeGateHomeMetrics() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      setLoadingCounts(true);
      try {
        const endpoints = [
          { key: "employees", path: "/employees?page=1&limit=1" },
          { key: "attendance", path: "/attendance?page=1&limit=1" },
          { key: "late-records", path: "/late-records?page=1&limit=1" },
          { key: "absences", path: "/absences?page=1&limit=1" },
        ];
        const results = await Promise.all(
          endpoints.map(async ({ key, path }) => {
            const res = await timegateFetch<TimeGateListResponse<unknown>>(path);
            return [key, res.meta.total] as const;
          }),
        );
        if (!cancelled) {
          const next: Record<string, number> = {};
          for (const [key, total] of results) next[key] = total;
          setCounts(next);
        }
      } catch {
        if (!cancelled) setCounts({});
      } finally {
        if (!cancelled) setLoadingCounts(false);
      }
    }
    void loadCounts();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(
    () => [
      { label: "Employés", value: loadingCounts ? "…" : String(counts["employees"] ?? 0), trendText: "TimeGate", trend: "up" as const },
      { label: "Pointages", value: loadingCounts ? "…" : String(counts["attendance"] ?? 0), trendText: "TimeGate", trend: "up" as const },
      { label: "Retards", value: loadingCounts ? "…" : String(counts["late-records"] ?? 0), trendText: "TimeGate", trend: "down" as const },
      { label: "Absences", value: loadingCounts ? "…" : String(counts["absences"] ?? 0), trendText: "TimeGate", trend: "down" as const },
    ],
    [counts, loadingCounts],
  );

  return <EcommerceMetrics items={metrics} />;
}
