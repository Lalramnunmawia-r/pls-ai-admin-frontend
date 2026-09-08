"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appApi } from "@/lib/api/client";
import { ModuleCard } from "../common/module-card";
import { JsonView } from "../common/json-view";
import { SimpleTable } from "../common/simple-table";

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
          <p className="text-sm text-slate-600">Failed chapter fetches: {data.data.failedChapterIds.length}</p>
          <SimpleTable items={data.data.items} />
          <details>
            <summary className="cursor-pointer text-sm text-slate-700">Raw payload</summary>
            <JsonView value={data.data} />
          </details>
        </div>
      )}
    </ModuleCard>
  );
}
