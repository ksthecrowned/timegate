"use client";
import { ArrowDownIcon, ArrowUpIcon, BoxIconLine, GroupIcon } from "@/icons";
import Badge from "../ui/badge/Badge";

type MetricItem = {
  label: string;
  value: number | string;
  trendText?: string;
  trend: "up" | "down";
};

interface EcommerceMetricsProps {
  items?: MetricItem[];
}

export const EcommerceMetrics = ({ items }: EcommerceMetricsProps) => {
  const metrics: MetricItem[] =
    items && items.length
      ? items
      : [
          { label: "Customers", value: "3,782", trendText: "11.01%", trend: "up" },
          { label: "Orders", value: "5,359", trendText: "9.05%", trend: "down" },
        ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {metrics.map((metric, index) => (
        <div
          key={`${metric.label}-${index}`}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            {index % 2 === 0 ? (
              <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
            ) : (
              <BoxIconLine className="text-gray-800 dark:text-white/90" />
            )}
          </div>
          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {metric.label}
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {metric.value}
              </h4>
            </div>
            <Badge color={metric.trend === "up" ? "success" : "error"}>
              {metric.trend === "up" ? (
                <ArrowUpIcon />
              ) : (
                <ArrowDownIcon className="text-error-500" />
              )}
              {metric.trendText ?? "—"}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
};
