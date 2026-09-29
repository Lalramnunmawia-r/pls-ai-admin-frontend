"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appApi } from "@/lib/api/client";
import { ModuleCard } from "../common/module-card";
import { RecordTable } from "../common/record-table";
import { asRows, display, text, whenField, type Row } from "../common/display";

type ReportRow = Row & { chapterId: string };

export function ReportsModule() {
  const [chapterIdsRaw, setChapterIdsRaw] = useState("");
  const chapterIds = chapterIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", chapterIdsRaw],
    queryFn: () => appApi.reports(chapterIds),
    enabled: false
  });

  const reports: ReportRow[] = (data?.data.items ?? []).flatMap((item) =>
    asRows(item.payload).map((report) => ({ ...report, chapterId: item.chapterId }))
  );
  const failed = data?.data.failedChapterIds ?? [];

  return (
    <ModuleCard title="Reports Inbox" description="Moderate content reports across multiple chapters.">
      <div className="mb-3 flex gap-2">
        <input
          value={chapterIdsRaw}
          onChange={(event) => setChapterIdsRaw(event.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="chapter-id-1,chapter-id-2"
        />
        <button onClick={() => void refetch()} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">
          Load
        </button>
      </div>
      {isLoading && <p className="text-sm text-slate-600">Loading reports...</p>}
      {error && <p className="text-sm text-red-600">Failed to load reports.</p>}
      {data && (
        <div className="space-y-3">
          {failed.length > 0 && (
            <p className="text-sm text-red-600">
              Could not load reports for {failed.length === 1 ? "1 chapter" : `${failed.length} chapters`}:{" "}
              {failed.join(", ")}
            </p>
          )}
          <RecordTable
            rows={reports}
            empty="No reports found."
            columns={[
              {
                key: "chapter",
                label: "Chapter",
                render: (row) => <span className="break-all">{row.chapterId}</span>
              },
              {
                key: "reporter",
                label: "Reporter",
                render: (row) => display(text(row, "reporter_name") || text(row, "reporter_email"))
              },
              { key: "summary", label: "Summary", render: (row) => display(text(row, "summary")) },
              { key: "reported", label: "Reported", render: (row) => whenField(row, "reported_at") }
            ]}
          />
        </div>
      )}
    </ModuleCard>
  );
}
