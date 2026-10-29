"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, BookOpen, CircleCheck, Clock, FileStack, Loader, Paperclip, XCircle, type LucideIcon } from "lucide-react";
import { appApi } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Notice, SectionTitle, SkeletonList } from "@/components/ui/layout";
import { ModuleCard } from "../common/module-card";
import { RecordTable } from "../common/record-table";
import { StatusBadge } from "../common/status-badge";
import { countStatus, display, formatWhen, isRow, text, whenField, type Row } from "../common/display";

const statusCards: { key: string; label: string; icon: LucideIcon; tone: string }[] = [
  { key: "approved", label: "Approved", icon: CircleCheck, tone: "bg-success-soft text-success" },
  { key: "review", label: "In review", icon: Clock, tone: "bg-warning-soft text-warning" },
  { key: "processing", label: "Processing", icon: Loader, tone: "bg-info-soft text-info" },
  { key: "rejected", label: "Rejected", icon: XCircle, tone: "bg-danger-soft text-danger" }
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
    <ModuleCard
      title="Dashboard"
      description={
        snapshot
          ? `Textbook extraction and resource indexing · updated ${formatWhen(snapshot.generatedAt)}`
          : "Textbook extraction and resource indexing"
      }
      actions={
        <Link
          href="/content"
          className="inline-flex h-9 items-center gap-1.5 rounded-control bg-accent px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          <BookOpen size={14} /> Manage content <ArrowRight size={14} />
        </Link>
      }
    >
      {isLoading && <SkeletonList rows={4} className="h-24" />}
      {error && <Notice tone="danger">Failed to load the dashboard.</Notice>}
      {snapshot && (
        <div className="space-y-8">
          <div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard label="Textbooks" value={snapshot.textbookTotal} icon={FileStack} tone="bg-accent-soft text-accent" />
              <SummaryCard label="Resources loaded" value={resources.length} icon={Paperclip} tone="bg-surface-muted text-ink-muted" />
              {statusCards.map((card) => (
                <SummaryCard key={card.key} label={card.label} value={countStatus(textbooks, card.key)} icon={card.icon} tone={card.tone} />
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-subtle">Status counts use the recent textbooks listed below.</p>
          </div>
          {snapshot.textbookError && <Notice tone="danger">Could not load textbooks.</Notice>}
          <section>
            <SectionTitle>Recent textbooks</SectionTitle>
            <RecordTable
              rows={textbooks}
              empty="No textbooks found."
              rowKey={(row, i) => text(row, "id") || String(i)}
              columns={[
                { key: "title", label: "Title", render: (row) => <span className="font-medium">{display(text(row, "title"))}</span> },
                { key: "hierarchy", label: "Hierarchy", render: (row) => display(text(row, "hierarchy_path")) },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={text(row, "status")} /> },
                { key: "publisher", label: "Publisher", render: (row) => display(text(row, "publisher")) },
                { key: "pages", label: "Pages", render: (row) => display(text(row, "total_pages")) },
                { key: "updated", label: "Updated", render: (row) => whenField(row, "updated_at", "created_at") }
              ]}
            />
          </section>
          {snapshot.resourceError && <Notice tone="danger">Could not load resources.</Notice>}
          <section>
            <SectionTitle>Recent resources</SectionTitle>
            <RecordTable rows={resources} empty="No resources found." rowKey={(row, i) => text(row, "id") || String(i)} columns={resourceColumns} />
          </section>
        </div>
      )}
    </ModuleCard>
  );
}

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: string }) {
  return (
    <Card className="flex items-center gap-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control ${tone}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
      </div>
    </Card>
  );
}

const resourceColumns = [
  { key: "title", label: "Title", render: (row: Row) => <span className="font-medium">{display(text(row, "title"))}</span> },
  { key: "hierarchy", label: "Hierarchy", render: (row: Row) => display(text(row, "hierarchy_path")) },
  { key: "type", label: "Type", render: (row: Row) => display(text(row, "resource_type")) },
  { key: "label", label: "Label", render: (row: Row) => display(text(row, "label")) },
  { key: "status", label: "Status", render: (row: Row) => <StatusBadge status={text(row, "status")} /> }
];
