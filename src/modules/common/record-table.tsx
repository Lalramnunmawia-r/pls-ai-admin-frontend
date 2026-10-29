"use client";

// Table styling follows lushaiedu_pls_web/components/ui/DataTable.tsx.
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/layout";

export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
};

export function RecordTable<T>({
  rows,
  columns,
  empty,
  rowKey
}: {
  rows: T[];
  columns: Column<T>[];
  empty: string;
  rowKey?: (row: T, index: number) => string;
}) {
  if (rows.length === 0) {
    return <EmptyState icon={<Inbox size={22} />} title={empty} className="py-8" />;
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-surface-muted/70 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {columns.map((column) => (
              <th key={column.key} className="border-b border-line px-5 py-3 align-middle">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey ? rowKey(row, index) : index} className="border-b border-line transition-colors last:border-b-0 hover:bg-surface-muted/50">
              {columns.map((column) => (
                <td key={column.key} className="px-5 py-3.5 align-middle text-ink">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
