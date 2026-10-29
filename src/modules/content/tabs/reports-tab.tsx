"use client";

import { useQuery } from "@tanstack/react-query";
import { Flag, ShieldCheck } from "lucide-react";
import { contentApi, qk } from "@/lib/api/admin-v2";
import { Card } from "@/components/ui/card";
import { EmptyState, Notice, SkeletonList } from "@/components/ui/layout";
import { formatWhen } from "../../common/display";

/** Issues students reported from the app ("report a problem"), for a chapter or one subtopic. */
export function ReportsTab({ chapterId, subtopicId }: { chapterId: string; subtopicId?: string }) {
  const reports = useQuery({ queryKey: qk.reports(chapterId, subtopicId), queryFn: () => contentApi.reports(chapterId, subtopicId) });
  if (reports.isLoading) return <SkeletonList rows={2} className="h-16" />;
  if (reports.error) return <Notice tone="danger">Failed to load reports.</Notice>;
  const rows = reports.data ?? [];
  if (rows.length === 0)
    return <EmptyState icon={<ShieldCheck size={22} />} title="No reported issues" message="Problems students report from the app show up here." />;
  return (
    <Card padding="p-0" className="divide-y divide-line overflow-hidden">
      {rows.map((r) => (
        <div key={r.id} className="flex gap-3 px-4 py-3 text-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
            <Flag size={14} />
          </span>
          <div className="min-w-0">
            <p className="whitespace-pre-wrap text-ink">{r.summary || "(no description)"}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {r.reporter_name || r.reporter_email || "Student"} · {formatWhen(r.reported_at)}
              {r.content_block_id && " · on a content block"}
              {r.practice_item_id && " · on a practice question"}
            </p>
          </div>
        </div>
      ))}
    </Card>
  );
}
