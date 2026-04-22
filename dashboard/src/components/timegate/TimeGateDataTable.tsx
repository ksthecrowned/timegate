"use client";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { ReactNode } from "react";

type Column = {
  key: string;
  label: string;
  className?: string;
};

type Props<T> = {
  columns: Column[];
  rows: T[];
  loading?: boolean;
  loadingLabel?: string;
  emptyLabel?: string;
  renderRow: (row: T) => ReactNode[];
};

export default function TimeGateDataTable<T>({
  columns,
  rows,
  loading = false,
  loadingLabel = "Chargement…",
  emptyLabel = "Aucune donnée.",
  renderRow,
}: Props<T>) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-900/40">
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  isHeader
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 ${column.className ?? ""}`}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell className="px-4 py-6 text-center text-sm text-gray-500" colSpan={columns.length}>
                  {loadingLabel}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell className="px-4 py-6 text-center text-sm text-gray-500" colSpan={columns.length}>
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  {renderRow(row).map((cell, cellIndex) => (
                    <TableCell key={`${index}-${cellIndex}`} className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
