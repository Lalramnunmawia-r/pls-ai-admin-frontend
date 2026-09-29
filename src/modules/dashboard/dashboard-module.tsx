"use client";

import { useQuery } from "@tanstack/react-query";
import { appApi } from "@/lib/api/client";
import { ModuleCard } from "../common/module-card";
import { RecordTable } from "../common/record-table";
import { StatusBadge } from "../common/status-badge";
import { countStatus, display, formatWhen, isRow, text, whenField, type Row } from "../common/display";

const statusCards = [
  { key: "approved", label: "Approved" },
  { key: "review", label: "In review" },
  { key: "processing", label: "Processing" },
  { key: "rejected", label: "Rejected" }
];

export function DashboardModule() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => appApi.jobs()
  });

  const snapshot = data?.data;
  const textbooks = (snapshot?.textbooks ?? []).filter(isRow);
  const resources = (snapshot?.resources ?? []).filter(isRow);

  return (
    <ModuleCard title="Operations Snapshot" description="Unified ingestion and resource processing status.">
      {isLoading && <p className="text-sm text-slate-600">Loading operations...</p>}
      {error && <p className="text-sm text-red-600">Failed to fetch jobs.</p>}
      {snapshot && (
        <div className="space-y-6">
          <p className="text-sm text-slate-500">Updated {formatWhen(snapshot.generatedAt)}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="Textbooks" value={snapshot.textbookTotal} />
            <SummaryCard label="Resources loaded" value={resources.length} />
            {statusCards.map((card) => (
              <SummaryCard key={card.key} label={card.label} value={countStatus(textbooks, card.key)} />
            ))}
          </div>
          <p className="text-xs text-slate-500">Status counts use the recent textbooks listed below.</p>
          {snapshot.textbookError && (
            <p className="text-sm text-red-600">Could not load textbooks.</p>
          )}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">Recent textbooks</h3>
            <RecordTable
              rows={textbooks}
              empty="No textbooks found."
              columns={[
                { key: "title", label: "Title", render: (row) => display(text(row, "title")) },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={text(row, "status")} /> },
                { key: "publisher", label: "Publisher", render: (row) => display(text(row, "publisher")) },
                { key: "edition", label: "Edition", render: (row) => display(text(row, "edition")) },
                { key: "pages", label: "Pages", render: (row) => display(text(row, "total_pages")) },
                { key: "updated", label: "Updated", render: (row) => whenField(row, "updated_at", "created_at") }
              ]}
            />
          </section>
          {snapshot.resourceError && (
            <p className="text-sm text-red-600">Could not load resources.</p>
          )}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">Recent resources</h3>
            <RecordTable
              rows={resources}
              empty="No resources found."
              columns={resourceColumns}
            />
          </section>
        </div>
      )}
    </ModuleCard>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-slate-50 px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

const resourceColumns = [
  { key: "title", label: "Title", render: (row: Row) => display(text(row, "title")) },
  { key: "type", label: "Type", render: (row: Row) => display(text(row, "resource_type")) },
  { key: "label", label: "Label", render: (row: Row) => display(text(row, "label")) },
  { key: "status", label: "Status", render: (row: Row) => <StatusBadge status={text(row, "status")} /> }
];
