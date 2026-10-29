"use client";

import { useQuery } from "@tanstack/react-query";
import { contentApi, qk } from "@/lib/api/admin-v2";
import { formatWhen } from "../../common/display";

/** Issues students reported from the app ("report a problem"), for a chapter or one subtopic. */
export function ReportsTab({ chapterId, subtopicId }: { chapterId: string; subtopicId?: string }) {
  const reports = useQuery({
    queryKey: qk.reports(chapterId, subtopicId),
    queryFn: () => contentApi.reports(chapterId, subtopicId)
  });
  if (reports.isLoading) return <p className="text-sm text-slate-500">Loading reports…</p>;
  if (reports.error) return <p className="text-sm text-red-600">Failed to load reports.</p>;
  const rows = reports.data ?? [];
  if (rows.length === 0) return <p className="text-sm text-slate-500">No issues reported by students.</p>;
  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((r) => (
        <li key={r.id} className="px-3 py-2.5 text-sm">
          <p className="whitespace-pre-wrap">{r.summary || "(no description)"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {r.reporter_name || r.reporter_email || "Student"} · {formatWhen(r.reported_at)}
            {r.content_block_id && " · on a content block"}
            {r.practice_item_id && " · on a practice question"}
          </p>
        </li>
      ))}
    </ul>
  );
}
